"""
Management commands that can be used to fine-tune course/program data
(and associated enrollments/grades/etc) for a user.
"""
from collections import namedtuple
from decimal import Decimal
import json
from functools import wraps
import shlex

from django.core.management import BaseCommand, CommandError

from courses.models import CourseRun
from grades.models import FinalGrade
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
    CourseRunFinder,
    UserFinder,
    CachedEnrollmentHandler,
    CachedCurrentGradeHandler,
    set_course_run_to_past_graded,
    set_course_run_current,
    set_course_run_future,
    set_course_run_to_paid,
    set_course_run_payment_status,
    clear_dashboard_data,
    is_fake_program_course_run,
    update_fake_course_run_edx_key,
    ensure_cached_data_freshness,
)


ExampleCommand = namedtuple('ExampleCommand', ['text', 'command', 'args'])


EXAMPLE_COMMANDS = [
    ExampleCommand(
        text="Get some convenient information about a course and a given user's enrollments/grades in that course",
        command='course_info',
        args=['--username', 'staff', '--program-title', 'Analog', '--course-title', '100'],
    ),
    ExampleCommand(
        text="For a user with a username 'staff', set the 'Analog Learning' 100-level course to enrolled",
        command='set_to_enrolled',
        args=['--username', 'staff', '--program-title', 'Analog', '--course-title', '100'],
    ),
    ExampleCommand(
        text="Same result as above, but the course title is specific enough to match a single Course",
        command='set_to_enrolled',
        args=['--username', 'staff', '--course-title', 'Analog Learning 100'],
    ),
    ExampleCommand(
        text="Same result as above, but the CourseRun is targeted "
             "directly instead of picking the most recent from the Course",
        command='set_to_enrolled',
        args=['--username', 'staff', '--course-run-key', 'course-v1:MITx+Analog+Learning+100+Apr_2017'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 300-level course to enrolled, and set it to start in the future",
        command='set_to_enrolled',
        args=['--username', 'staff', '--course-title', 'Analog Learning 300', '--in-future'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 200-level course to passed with a default grade",
        command='set_to_passed',
        args=['--username', 'staff', '--course-title', 'Analog Learning 200'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 200-level course to failed with a specific grade",
        command='set_to_failed',
        args=['--username', 'staff', '--course-title', 'Analog Learning 200', '--grade', '45'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 300-level course to enrolled, but in need of upgrade (aka 'audit')",
        command='set_to_needs_upgrade',
        args=['--username', 'staff', '--program-title', 'Analog', '--course-title', '300'],
    ),
    ExampleCommand(
        text="(Another way to achieve the result of the above command...)",
        command='set_to_enrolled',
        args=['--username', 'staff', '--course-title', 'Analog Learning 100', '--audit'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 300-level course to enrolled and in need of upgrade, but past the deadline",
        command='set_to_needs_upgrade',
        args=['--username', 'staff', '--course-title', 'Analog Learning 300', '--missed-deadline'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 100-level course to have an offered course run (and no enrollments)",
        command='set_to_offered',
        args=['--username', 'staff', '--course-title', 'Analog Learning 100'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 100-level course to have an offered course run with a fuzzy start date",
        command='set_to_offered',
        args=['--username', 'staff', '--course-title', 'Analog Learning 100', '--fuzzy'],
    ),
    ExampleCommand(
        text="Set the 'Analog Learning' 100-level course to be paid but not enrolled",
        command='set_to_paid_but_not_enrolled',
        args=['--username', 'staff', '--course-title', 'Analog Learning 100'],
    ),
    ExampleCommand(
        text="Get a past ungraded course run for a course and set it to failed with a specific grade",
        command='set_past_run_to_failed',
        args=['--username', 'staff', '--program-title', 'Analog', '--course-title', '100', '--grade', '30'],
    ),
    ExampleCommand(
        text="Get a past ungraded course run for a course and set it to passed",
        command='set_past_run_to_passed',
        args=['--username', 'staff', '--program-title', 'Analog', '--course-title', '100'],
    ),
    ExampleCommand(
        text="Set a course to have a past course run that is passed, unpaid, and still upgradeable",
        command='set_past_run_to_passed',
        args=['--username', 'staff', '--course-title', 'Analog Learning 200', '--audit'],
    ),
    ExampleCommand(
        text="Clear all of a user's dashboard data (final grade data, cached edX data, payment data) for a course",
        command='clear_user_dashboard_data',
        args=['--username', 'staff', '--course-title', 'Analog Learning 100'],
    ),
]
EXAMPLE_COMMAND_TEMPLATE = """
    # {text}
    alter_data {command} {args}
"""


USAGE_DETAILS = ("""
    Example commands:
{commands}""".format(commands="".join([EXAMPLE_COMMAND_TEMPLATE.format(
    text=command.text,
    command=command.command,
    args=" ".join(shlex.quote(arg) for arg in command.args),
) for command in EXAMPLE_COMMANDS])))

NEW_COURSE_RUN_PREFIX = 'new-course-run'


def course_state_editor(func):
    """
    Decorator for any method that will be used to alter a Course's 'state'. It does a few useful things:

     1. Clears any lingering dashboard data for a given course run to ensure that it will be in the right state
        after the command.
     2. Allows the user to specify a Course instead of CourseRun and automatically choose the most recent CourseRun
        related to that Course.
     3. Change some edX data for our fake CourseRuns to match any update CourseRun dates (eg: edx_course_keys that
        reference the CourseRun.start_date)
    """
    @wraps(func)
    def wrapper(*args, **kwargs):  # pylint: disable=missing-docstring
        user = kwargs['user']
        course_run = kwargs.get('course_run')
        # If a Course was specified instead of a CourseRun, use the latest CourseRun in the set
        if not course_run:
            course = kwargs['course']
            course_run = course.courserun_set.order_by('fuzzy_start_date', '-start_date').first()
            kwargs['course_run'] = course_run
            del kwargs['course']
        # Clear existing dashboard data for the CourseRun (cached edX data, final grades, etc.)
        clear_dashboard_data(user, course_run=course_run)
        # Call the wrapped function
        ret_val = func(*args, **kwargs)
        # If this is a fake course run, update associated edX data to match any new dates set
        # on the CourseRun (eg: edx_course_key and course id's in raw edX data)
        if is_fake_program_course_run(course_run) and course_run.start_date:
            update_fake_course_run_edx_key(user, course_run)
        return ret_val
    return wrapper


@course_state_editor
def set_to_passed(user=None, course_run=None, grade=DEFAULT_GRADE, audit=False, missed_deadline=False):
    """Sets a course run to have a passing grade"""
    set_course_run_to_past_graded(
        user=user,
        course_run=course_run,
        grade=grade,
        upgradeable=audit and not missed_deadline
    )
    set_course_run_payment_status(user, course_run, paid=not audit)
    return course_run


@course_state_editor
def set_to_failed(user=None, course_run=None, grade=DEFAULT_FAILED_GRADE, audit=False, missed_deadline=False):
    """Sets a course run to have a failing grade"""
    set_course_run_to_past_graded(
        user=user,
        course_run=course_run,
        grade=grade,
        upgradeable=audit and not missed_deadline
    )
    set_course_run_payment_status(user, course_run, paid=not audit)
    return course_run


@accepts_or_calculates_now
def set_past_run_to_passed(user=None, course=None, now=None, **kwargs):
    """Adds a past passed course run for a given user and course"""
    ungraded_past_run = get_past_ungraded_course_run(user, course, now)
    return set_to_passed(user=user, course_run=ungraded_past_run, **kwargs)


@accepts_or_calculates_now
def set_past_run_to_failed(user=None, course=None, now=None, **kwargs):
    """Adds a past failed course run for a given user and course"""
    ungraded_past_run = get_past_ungraded_course_run(user, course, now)
    return set_to_failed(user=user, course_run=ungraded_past_run, **kwargs)


@course_state_editor
def set_to_enrolled(user=None, course_run=None, in_future=False,  # pylint: disable=too-many-arguments
                    grade=None, audit=False, missed_deadline=False):
    """Sets a course run to be current and enrolled"""
    enrollable_setting = dict(enrollable_past=True) if missed_deadline else dict(enrollable_now=True)
    if in_future:
        set_course_run_future(course_run, save=True, **enrollable_setting)
    else:
        set_course_run_current(course_run, upgradeable=not missed_deadline, save=True, **enrollable_setting)
    CachedEnrollmentHandler(user).set_or_create(course_run, verified=not audit)
    if grade:
        CachedCurrentGradeHandler(user).set_or_create(course_run, grade=grade)
    set_course_run_payment_status(user, course_run, paid=not audit)
    return course_run


def set_to_needs_upgrade(**kwargs):
    """Sets a course run to be current, enrolled, and in need of upgrading"""
    kwargs.update(dict(audit=True, in_future=False))
    return set_to_enrolled(**kwargs)


def set_to_paid_but_not_enrolled(user=None, **kwargs):
    """Sets a course run to be paid but not enrolled for a user"""
    course_run = set_to_offered(user=user, **kwargs)
    set_course_run_to_paid(user=user, course_run=course_run)
    return course_run


@course_state_editor
@accepts_or_calculates_now
def set_to_offered(user=None, course_run=None, now=None,  # pylint: disable=unused-argument
                   in_future=False, fuzzy=False):
    """Sets a course run to be in the present or future, and unenrolled for a user"""
    if fuzzy:
        fuzzy_date_string = 'Spring {}'.format(now.year + 1)
        course_run.fuzzy_start_date = fuzzy_date_string
        course_run.fuzzy_enrollment_start_date = fuzzy_date_string
        course_run.start_date = None
        course_run.enrollment_start = None
        course_run.end_date = None
        course_run.enrollment_end = None
    elif in_future:
        set_course_run_future(course_run)
    else:
        set_course_run_current(course_run)
    course_run.save()
    return course_run


def clear_user_dashboard_data(user=None, course=None, course_run=None):
    """Clears all of a user's final grade data and all cached edX data for a course/course run"""
    clear_dashboard_data(user=user, course=course, course_run=course_run)


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
        final_grade = FinalGrade.objects.filter(user=user, course_run=run).first()
        if final_grade:
            run_result['final_grade'] = 'Grade: {}, Status: {}, Passed: {}, Paid on edX: {}'.format(
                final_grade.grade, final_grade.status, final_grade.passed, final_grade.course_run_paid_on_edx
            )
        run_results.append(run_result)
    results['course_runs'] = run_results
    return results


def get_past_ungraded_course_run(user=None, course=None, now=None):
    """Loop through past course runs and find one without grade data"""
    past_runs = CourseRun.objects.filter(
        course=course,
        end_date__lt=now,
    ).exclude(end_date=None).order_by('-end_date').all()
    for past_run in past_runs:
        if not (CachedCurrentGradeHandler(user).exists(past_run) or
                FinalGrade.objects.filter(user=user, course_run=past_run).exists()):
            return past_run
    raise CommandError("Can't find past run that isn't already passed/failed for Course '{}'".format(course.title))


def _formatted_datetime(dt):
    """Returns a string of a given datetime to be printed in command output"""
    if not dt:
        return None
    return localized_datetime(dt).isoformat()


COURSE_COMMAND_FUNCTIONS = {
    func.__name__: func for func in [
        set_to_offered,
        set_to_passed,
        set_to_failed,
        set_to_enrolled,
        set_to_needs_upgrade,
        set_to_paid_but_not_enrolled,
        set_past_run_to_failed,
        set_past_run_to_passed,
        clear_user_dashboard_data,
        course_info,
    ]
}
EXAMPLE_USAGE_COMMAND_NAME = 'examples'

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
}


class Command(BaseCommand):
    """
    Fine-tune course/program data (and associated enrollments/grades/etc) for a user, and set their
    cached edX data to be considered 'fresh'.
    """
    help = """
    Fine-tune course/program data (and associated enrollments/grades/etc) for a user, and set their
    cached edX data to be considered 'fresh'.
    For detailed usage examples, run the command with '{0}' (ie: 'manage.py alter_data {0}')
    """.format(EXAMPLE_USAGE_COMMAND_NAME)

    def add_arguments(self, parser):
        # Add arguments for allowed actions
        allowed_action_names = list(COURSE_COMMAND_FUNCTIONS.keys())
        allowed_action_names.extend([EXAMPLE_USAGE_COMMAND_NAME])
        parser.add_argument(
            'action',
            choices=allowed_action_names,
            help='Program-/Course-/CourseRun-related action (choose one)'
        )
        # Add arguments for parameters that will be used to find Courses/Users
        for finder_cls in {CourseFinder, CourseRunFinder, UserFinder}:
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
        if options['action'] == EXAMPLE_USAGE_COMMAND_NAME:
            self.stdout.write(USAGE_DETAILS)
        else:
            action_func = COURSE_COMMAND_FUNCTIONS[options['action']]
            action_params = {}
            user_finder_params = self.filter_options(options, UserFinder.param_keys)
            action_params['user'] = UserFinder.find(**user_finder_params)
            course_finder_params = self.filter_options(options, CourseFinder.param_keys)
            if course_finder_params:
                action_params['course'] = CourseFinder.find(**course_finder_params)
            course_run_finder_params = self.filter_options(options, CourseRunFinder.param_keys)
            if course_run_finder_params:
                action_params['course_run'] = CourseRunFinder.find(**course_run_finder_params)
            additional_params = self.filter_options(options, ADDITIONAL_PARAMS.keys())
            # Coerce 'grade' to decimal if it exists
            if 'grade' in additional_params:
                additional_params['grade'] = Decimal(int(additional_params['grade'])/100)
            # Execute the action
            action_params.update(additional_params)
            result = action_func(**action_params)
            if isinstance(result, CourseRun):
                self.stdout.write("Course run changed: (id: {}, edx_course_key: {})\nUser: {}; Course: {}".format(
                    result.id,
                    result.edx_course_key,
                    action_params['user'].username,
                    result.course.title
                ))
            elif isinstance(result, dict):
                self.stdout.write(json.dumps(result, indent=2))
            elif result:
                self.stdout.write(result)
            # Ensure that the given user's edX data will be considered 'fresh'
            ensure_cached_data_freshness(user=action_params['user'])
