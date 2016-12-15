"""
Management commands that can be used to fine-tune course/program data
(and associated enrollments/grades/etc) for a user.
"""
from decimal import Decimal
import json
from django.core.management import BaseCommand
from django.db import transaction

from courses.models import Program, CourseRun
from seed_data.management.commands import DEFAULT_GRADE, DEFAULT_FAILED_GRADE
from seed_data.utils import (
    accepts_or_calculates_now,
    filter_dict_by_key_set,
    filter_dict_none_values,
    localized_datetime
)
from seed_data.lib import (
    CACHED_HANDLERS,
    CourseFinder,
    UserFinder,
    course_state_editor,
    needs_non_fa_program,
    CachedEnrollmentHandler,
    CachedCertificateHandler,
    CachedCurrentGradeHandler,
    set_course_run_past,
    set_course_run_current,
    set_course_run_future,
    set_program_financial_aid,
)


USAGE_DETAILS = (
    """
    Example commands:

    # Turn financial aid off/on for a program with a title that contains 'Analog'
    alter_data --action=turn_financial_aid_off --program-title="Analog"
    alter_data --action=turn_financial_aid_on --program-title="Analog"

    # For a user with a username 'staff', set the 'Analog Learning' 100-level course to enrolled
    alter_data --action=set_course_to_enrolled --username=staff --program-title='Analog' --course-title='100'

    # Set the 'Analog Learning' 200-level course to failed with a specific grade
    alter_data --action=set_course_to_failed --username=staff --program-title='Analog' --course-title='200' --grade=45

    # Set the 'Analog Learning' 300-level course to enrolled
    alter_data --action=set_course_to_enrolled --username=staff --program-title='Analog' --course-title='300'

    # Set the 'Analog Learning' 300-level course to enrolled, and set it to start in the future
    """
    "alter_data --action=set_course_to_enrolled --username=staff --program-title='Analog' --course-title='300' "
    "--in-future"
    """

    # Set the 'Analog Learning' 300-level course to enrolled, but in need of upgrade (aka 'audit')
    alter_data --action=set_course_to_needs_upgrade --username=staff --program-title='Analog' --course-title='300'

    # (Another way to achieve the result of the above command...)
    alter_data --action=set_course_to_enrolled --username=staff --program-title='Analog' --course-title='100' --audit

    # Set the 'Analog Learning' 300-level course to enrolled and in need of upgrade, but past the deadline
    """
    "alter_data --action=set_course_to_needs_upgrade --username=staff --program-title='Analog' "
    "--course-title='300' --missed-deadline"
    """

    # Set the 'Analog Learning' 100-level course to have an offered course run (and no enrollments)
    alter_data --action=set_course_to_offered --username=staff --program-title='Analog' --course-title='100'

    # Set the 'Analog Learning' 100-level course to have an offered course run with a fuzzy start date
    alter_data --action=set_course_to_offered --username=staff --program-title='Analog' --course-title='100' --fuzzy

    # Add a past failed course run with a specific grade
    alter_data --action=add_past_failed_run --username=staff --program-title='Analog' --course-title='100' --grade=30

    # Add a past failed course run, even if a previous failed run already exists
    """
    "alter_data --action=add_past_failed_run --username=staff --program-title='Analog' --course-title='100' "
    "--add-if-exists"
    """

    # Add a past passed course run with a specific grade
    """
    "alter_data --action=add_past_passed_run --username=staff --program-title='Analog' --course-title='100'"
    "--add-if-exists"
    """


    # Add an enrollable future course run for a program called 'Test Program' and a course called 'Test Course'
    alter_data --action=add_future_run --username=staff --program-title='Test Program' --course-title='Test Course'
    """
)

NEW_COURSE_RUN_PREFIX = 'new-course-run'


@course_state_editor
@needs_non_fa_program
def set_course_to_passed(user=None, course_run=None, grade=DEFAULT_GRADE):
    """Sets a course to have a passed course run"""
    set_course_run_past(course_run, save=True)
    CachedEnrollmentHandler(user).set_or_create(course_run=course_run)
    CachedCertificateHandler(user).set_or_create(course_run=course_run, grade=grade)
    return course_run


@course_state_editor
@needs_non_fa_program
def set_course_to_failed(user=None, course_run=None, grade=DEFAULT_FAILED_GRADE):
    """Sets a course to have a failed course run"""
    set_course_run_past(course_run, save=True)
    CachedEnrollmentHandler(user).set_or_create(course_run=course_run)
    CachedCurrentGradeHandler(user).set_or_create(course_run=course_run, grade=grade)
    return course_run


@course_state_editor
@accepts_or_calculates_now
def set_course_to_offered(user=None, course_run=None, now=None,  # pylint: disable=unused-argument
                          in_future=False, fuzzy=False):
    """Sets a course to have an offered course run that a given user is not enrolled in"""
    if fuzzy:
        course_run.fuzzy_start_date = 'Spring 2017'
        course_run.fuzzy_enrollment_start_date = 'Spring 2017'
        course_run.start_date = None
        course_run.end_date = None
        course_run.enrollment_end = None
    elif in_future:
        set_course_run_future(course_run)
    else:
        set_course_run_current(course_run)
    course_run.save()
    return course_run


@course_state_editor
def set_course_to_enrolled(user=None, course_run=None, in_future=False,  # pylint: disable=too-many-arguments
                           grade=None, audit=False, missed_deadline=False):
    """Sets a course to have a currently-enrolled course run"""
    enrollable_setting = dict(enrollable_past=True) if missed_deadline else dict(enrollable_now=True)
    if in_future:
        set_course_run_future(course_run, save=True, **enrollable_setting)
    else:
        set_course_run_current(course_run, upgradeable=not missed_deadline, save=True, **enrollable_setting)
    CachedEnrollmentHandler(user).set_or_create(course_run, verified=not audit)
    if grade:
        CachedCurrentGradeHandler(user).set_or_create(course_run, grade=grade)
    return course_run


@course_state_editor
def set_course_to_needs_upgrade(**kwargs):
    """Sets a course to have an enrolled course run that needs to be upgraded (aka 'audit')"""
    kwargs.update(dict(audit=True, in_future=False))
    return set_course_to_enrolled(**kwargs)


@accepts_or_calculates_now
def add_future_run(user=None, course=None, now=None):  # pylint: disable=unused-argument
    """Adds a future enrollable course run for a course"""
    base_edx_course_key = '{}-{}'.format(NEW_COURSE_RUN_PREFIX, now.strftime('%m-%d-%Y'))
    default_title = base_edx_course_key
    key_append = 0
    new_course_run = None
    created = False
    with transaction.atomic():
        while not new_course_run or not created:
            new_course_run, created = CourseRun.objects.get_or_create(
                course=course,
                title=default_title,
                edx_course_key='{}-{}'.format(base_edx_course_key, key_append),
            )
            key_append += 1
    set_course_run_future(new_course_run, save=True)
    return new_course_run


def clear_future_runs(user=None, course=None):  # pylint: disable=unused-argument
    """Clears future enrollable course runs that were added by this script"""
    return CourseRun.objects.filter(course=course, edx_course_key__startswith=NEW_COURSE_RUN_PREFIX).delete()


def get_past_course_run(user=None, course=None, now=None, add_if_exists=False):
    """Loop through past course runs and find one without CachedCurrentGrade data"""
    chosen_past_run = None
    past_runs = CourseRun.objects.filter(
        course=course,
        end_date__lt=now,
    ).exclude(end_date=None).order_by('-end_date').all()
    for past_run in past_runs:
        if not (CachedCurrentGradeHandler(user).exists(past_run) or
                CachedCertificateHandler(user).exists(past_run)):
            chosen_past_run = past_run
        elif not add_if_exists:
            raise Exception("Past failed/passed course run already exists (id: {}, title: {})".format(
                past_run.id,
                past_run.title
            ))
    if not chosen_past_run:
        raise Exception("Can't find past run w/o CachedCurrentGrade")
    return chosen_past_run


@accepts_or_calculates_now
def add_past_failed_run(user=None, course=None, now=None, grade=DEFAULT_FAILED_GRADE, add_if_exists=False):
    """Adds a past failed course run for a given user and course"""
    chosen_past_run = get_past_course_run(user, course, now, add_if_exists)

    # Add enrollment and failed grade for course run
    CachedEnrollmentHandler(user).set_or_create(course_run=chosen_past_run)
    CachedCurrentGradeHandler(user).set_or_create(course_run=chosen_past_run, grade=grade)
    return chosen_past_run


@accepts_or_calculates_now
def add_past_passed_run(user=None, course=None, now=None, grade=DEFAULT_GRADE, add_if_exists=False):
    """Adds a past passed course run for a given user and course"""
    chosen_past_run = get_past_course_run(user, course, now, add_if_exists)
    # Add enrollment and  certificate for course run
    CachedEnrollmentHandler(user).set_or_create(course_run=chosen_past_run)
    CachedCertificateHandler(user).set_or_create(course_run=chosen_past_run, grade=grade)

    return chosen_past_run


def _formatted_datetime(dt, dt_format='%m/%d/%Y'):
    if not dt:
        return None
    return localized_datetime(dt).strftime(dt_format)


def course_info(user=None, course=None):
    """Convenience method to show some consequential information for a course"""
    results = {'course_title': course.title}
    run_results = []
    for run in course.courserun_set.order_by('-start_date').all():
        run_result = {
            'id': run.id,
            'edx_course_key': run.edx_course_key,
            'start_date': _formatted_datetime(run.start_date),
            'end_date': _formatted_datetime(run.end_date)
        }
        for key in ['fuzzy_start_date', 'fuzzy_enrollment_start_date']:
            if getattr(run, key, None):
                run_result[key] = getattr(run, key)
        for date_key in ['enrollment_start', 'enrollment_end', 'upgrade_deadline']:
            if getattr(run, date_key, None):
                run_result[date_key] = _formatted_datetime(getattr(run, date_key))
        for model_cls in CACHED_HANDLERS:
            obj = model_cls.objects.filter(user=user, course_run=run).first()
            if obj:
                run_result['edx_data'] = run_result.get('edx_data', {})
                run_result['edx_data'][model_cls.__name__] = obj.data
        run_results.append(run_result)
    results['course_runs'] = run_results
    return results


COURSE_COMMAND_FUNCTIONS = {
    func.__name__: func for func in [
        set_course_to_offered,
        set_course_to_passed,
        set_course_to_failed,
        set_course_to_enrolled,
        set_course_to_needs_upgrade,
        add_future_run,
        clear_future_runs,
        add_past_failed_run,
        add_past_passed_run,
        course_info,
    ]
}

ADDITIONAL_PARAMS = {
    'grade': {
        'type': int,
        'help': "Course grade"
    },
    'in_future': {
        'type': bool,
        'help': "Include if you want the course run to be in the future"
    },
    'fuzzy': {
        'type': bool,
        'help': "Include if you want the course run to have a fuzzy start date"
    },
    'missed_deadline': {
        'type': bool,
        'help': "Include if you want the course run to have a missed upgrade deadline"
    },
    'audit': {
        'type': bool,
        'help': "Include if you want the course run to be an audit (ie: the user hasn't paid yet, needs to upgrade)"
    },
    'add_if_exists': {
        'type': bool,
        'help': "Include if you want to set a past run to failed even if there is an existing failed run"
    },
}


class Command(BaseCommand):
    """
    Fine-tune course/program data (and associated enrollments/grades/etc) for a user.
    """
    help = "Fine-tune course/program data (and associated enrollments/grades/etc) for a user."

    def add_arguments(self, parser):
        # Add argument to show example commands
        parser.add_argument(
            '--usage',
            action='store_true',
            default=None,
            help='Show usage details/example commands'
        )
        # Add arguments for allowed actions
        allowed_action_names = list(COURSE_COMMAND_FUNCTIONS.keys())
        allowed_action_names.extend(['turn_financial_aid_off', 'turn_financial_aid_on'])
        parser.add_argument(
            '--action',
            choices=allowed_action_names,
            help='Program-/Course-related action'
        )
        # Add arguments for parameters that will be used to find Courses/Users
        for finder_cls in {CourseFinder, UserFinder}:
            for param_key in finder_cls.param_keys:
                parser.add_argument(
                    '--{}'.format(param_key.replace('_', '-')),
                    dest=param_key,
                    action='store',
                    help="Parameter to find a specific {}".format(finder_cls.model_cls.__name__)
                )
        # Add arguments for making more specific changes to course states
        for arg_name, arg_props in ADDITIONAL_PARAMS.items():
            parser.add_argument(
                '--{}'.format(arg_name.replace('_', '-')),
                dest=arg_name,
                action='store_true' if arg_props['type'] == bool else 'store',
                default=None,
                help="{} (Only relevant to certain course actions)".format(arg_props['help'])
            )

    @staticmethod
    def filter_options(options, desired_key_set):
        """Filters the option dict by given keys and removes null values"""
        return filter_dict_none_values(filter_dict_by_key_set(options, desired_key_set))

    def handle(self, *args, **options):
        if options['usage']:
            self.stdout.write(USAGE_DETAILS)
        elif 'turn_financial_aid_' in options['action']:
            program = Program.objects.get(title__contains=options['program_title'])
            set_to = options['action'].endswith('on')
            set_program_financial_aid(program, set_to=set_to)
        else:
            action_func = COURSE_COMMAND_FUNCTIONS[options['action']]
            user_finder_params = self.filter_options(options, UserFinder.param_keys)
            user = UserFinder().find(**user_finder_params)
            course_finder_params = self.filter_options(options, CourseFinder.param_keys)
            course = CourseFinder().find(**course_finder_params)
            additional_params = self.filter_options(options, ADDITIONAL_PARAMS.keys())
            # Coerce 'grade' to decimal if it exists
            if 'grade' in additional_params:
                additional_params['grade'] = Decimal(int(additional_params['grade'])/100)
            # Execute the action
            result = action_func(user=user, course=course, **additional_params)
            if isinstance(result, CourseRun):
                self.stdout.write("Course run changed: (id: {}, edx_course_key: {})\nUser: {}; Course: {}".format(
                    result.id,
                    result.edx_course_key,
                    user.username,
                    course.title
                ))
            elif isinstance(result, dict):
                self.stdout.write(json.dumps(result, indent=2))
            else:
                self.stdout.write(result)
