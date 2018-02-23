"""
Generates a set of realistic users/programs to help us test search functionality
"""
from decimal import Decimal
from django.core.management import BaseCommand
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from factory.django import mute_signals

from backends.edxorg import EdxOrgOAuth2
from courses.models import Program, Course, CourseRun
from dashboard.models import ProgramEnrollment
from grades.models import FinalGrade, FinalGradeStatus
from micromasters.utils import (
    get_field_names,
    load_json_from_file,
    first_matching_item,
)
from profiles.api import get_social_username
from profiles.models import Employment, Education, Profile
from roles.models import Role
from roles.roles import Staff
from search.indexing_api import recreate_index
from seed_data.utils import filter_dict_by_key_set
from seed_data.lib import (
    CachedEnrollmentHandler,
    fake_programs_query,
    ensure_cached_data_freshness,
    add_paid_order_for_course
)
from seed_data.management.commands import (  # pylint: disable=import-error
    USER_DATA_PATH, PROGRAM_DATA_PATH,
    FAKE_USER_USERNAME_PREFIX, FAKE_PROGRAM_DESC_PREFIX,
    PASSING_GRADE
)
from seed_data.management.commands.create_tiers import create_tiers


MODEL_DEFAULTS = {
    User: {
        'is_active': True,
        'is_staff': False,
        'is_superuser': False
    },
    Profile: {
        'account_privacy': 'private',
        'edx_requires_parental_consent': False,
        'email_optin': True,
        'filled_out': True,
    },
    Education: {
        'online_degree': False
    }
}


def compile_model_data(model_cls, data, **additional_data):
    """
    Compiles a dictionary of data that will be set on a model object
    """
    model_data = {}
    field_names = get_field_names(model_cls)
    # If default values have been specified, set them on the model data dict
    if model_cls in MODEL_DEFAULTS:
        model_data.update(MODEL_DEFAULTS[model_cls])
    # For all keys that match valid model fields, update the model data dict
    model_data.update(filter_dict_by_key_set(data, field_names))
    # For any other data that has been specifically passed in, update the model data dict
    if additional_data:
        model_data.update(additional_data)
    return model_data


def deserialize_model_data(model_cls, data, **additional_data):
    """
    Creates a new instance of a model class and fills in field values using some supplied data
    """
    model_data = compile_model_data(model_cls, data, **additional_data)
    return model_cls.objects.create(**model_data)


# User data deserialization

def deserialize_user_data(user_data, programs):
    """
    Deserializes a dict of mixed User/Profile data and returns the newly-inserted User
    """
    username = FAKE_USER_USERNAME_PREFIX + user_data['email'].split('@')[0]
    user = deserialize_model_data(User, user_data, username=username)
    # Create social username
    user.social_auth.create(
        provider=EdxOrgOAuth2.name,
        uid=user.username,
    )
    # The user data is generated in this script with mute_signals(post_save)
    # so we need to create the profile explicitly.
    profile = deserialize_model_data(Profile, user_data, user=user, fake_user=True)
    deserialize_profile_detail_data(profile, Employment, user_data['work_history'])
    deserialize_profile_detail_data(profile, Education, user_data['education'])
    deserialize_dashboard_data(user, user_data, programs)
    ensure_cached_data_freshness(user)
    return user


def deserialize_dashboard_data(user, user_data, programs):
    """
    Deserializes enrollment/grade data for a user
    """
    fake_course_runs = CourseRun.objects.filter(
        course__program__in=programs
    ).select_related('course__program').all()
    social_username = get_social_username(user)
    enrollment_list = user_data.get('_enrollments', [])
    grade_list = user_data.get('_grades', [])
    deserialize_enrollment_data(user, social_username, fake_course_runs, enrollment_list)
    deserialize_grade_data(user, fake_course_runs, grade_list)


def deserialize_enrollment_data(user, social_username, course_runs, enrollment_data_list):
    """
    Deserializes enrollment data for a user
    """
    enrollment_handler = CachedEnrollmentHandler(user, social_username=social_username)
    enrolled_programs = set()
    edx_course_key = None
    for enrollment_data in enrollment_data_list:
        edx_course_key = enrollment_data['edx_course_key']
        course_run = first_matching_item(
            course_runs,
            lambda cr: cr.edx_course_key == edx_course_key
        )
        enrollment_handler.set_or_create(course_run)
        enrolled_programs.add(course_run.course.program)
        if course_run.course.program.financial_aid_availability:
            add_paid_order_for_course(user, course_run)
    # Add ProgramEnrollments for any Program that has an associated CachedEnrollment
    for enrolled_program in enrolled_programs:
        ProgramEnrollment.objects.get_or_create(user=user, program=enrolled_program)


def deserialize_grade_data(user, course_runs, grade_data_list):
    """
    Deserializes grade data for a user
    """
    edx_course_key = None
    for grade_data in grade_data_list:
        edx_course_key = grade_data['edx_course_key']
        course_run = first_matching_item(
            course_runs,
            lambda cr: cr.edx_course_key == edx_course_key
        )
        grade = Decimal(grade_data['grade'])
        FinalGrade.objects.update_or_create(
            user=user,
            course_run=course_run,
            grade=grade,
            passed=grade >= PASSING_GRADE,
            status=FinalGradeStatus.COMPLETE,
            course_run_paid_on_edx=True
        )


def deserialize_profile_detail_data(profile, model_cls, profile_detail_data):
    """
    Deserializes a list of data for a model with a many-to-one relationship with Profile (eg: Education)
    """
    for profile_detail in profile_detail_data:
        deserialize_model_data(model_cls, profile_detail, profile=profile)


def deserialize_user_data_list(user_data_list, programs):
    """
    Deserializes a list of user data and returns the count of new Users created
    """
    new_user_count = 0
    for user_data in user_data_list:
        deserialize_user_data(user_data, programs)
        new_user_count += 1
    return new_user_count


# Program data deserialization

def deserialize_course_run_data(course, course_run_data):
    """Deserializes a CourseRun object"""
    course_run = deserialize_model_data(
        CourseRun, course_run_data, course=course
    )
    return course_run


def deserialize_course_data(program, course_data):
    """Deserializes a Course object"""
    course = deserialize_model_data(Course, course_data, program=program)
    for course_run_data in course_data['course_runs']:
        deserialize_course_run_data(course, course_run_data)
    return course


def deserialize_program_data(program_data):
    """Deserializes a Program object"""
    program = deserialize_model_data(Program, program_data)
    for course_data in program_data['courses']:
        deserialize_course_data(program, course_data)
    return program


def deserialize_program_data_list(program_data_list):
    """Deserializes a list of Program data"""
    programs = []
    for program_data in program_data_list:
        # Set the description to make this Program easily identifiable as a 'fake'
        program_data['description'] = FAKE_PROGRAM_DESC_PREFIX + program_data['description']
        program_data['live'] = True
        program = deserialize_program_data(program_data)
        programs.append(program)
    return programs


class Command(BaseCommand):
    """
    Seed the database with a set of realistic data, for development purposes.
    """
    help = "Seed the database with a set of realistic data, for development purposes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tiers",
            dest="tiers",
            default=4,
            help="Number of TierPrograms to generate per Program.",
            type=int
        )
        parser.add_argument(
            '--staff-user',
            action='store',
            dest='staff_user',
            help=(
                "Username for a user to assign the 'staff' role "
                "for the programs created by this script."
            )
        )

    @staticmethod
    def assign_staff_user_to_programs(username, programs):
        """
        Assigns the 'staff' role to all given programs for a user with a given username
        """
        staff_user = User.objects.get(username=username)
        for program in programs:
            ProgramEnrollment.objects.create(user=staff_user, program=program)
            Role.objects.create(user=staff_user, program=program, role=Staff.ROLE_ID)

    def handle(self, *args, **options):  # pylint: disable=too-many-locals
        program_data_list = load_json_from_file(PROGRAM_DATA_PATH)
        user_data_list = load_json_from_file(USER_DATA_PATH)
        existing_fake_user_count = User.objects.filter(username__startswith=FAKE_USER_USERNAME_PREFIX).count()
        existing_fake_program_count = fake_programs_query().count()
        if len(user_data_list) == existing_fake_user_count and len(program_data_list) == existing_fake_program_count:
            fake_programs = fake_programs_query().all()
            self.stdout.write("Seed data appears to already exist.")
        else:
            recreate_index()
            # Mute post_save to prevent updates to Elasticsearch on a per program or user basis.
            # recreate_index() is run afterwards to do this indexing in bulk.
            with mute_signals(post_save):
                fake_programs = deserialize_program_data_list(program_data_list)
                fake_user_count = deserialize_user_data_list(user_data_list, fake_programs)

            # Handle FA programs
            fake_financial_aid_programs = filter(lambda program: program.financial_aid_availability, fake_programs)
            tiered_program_count, tiers_created = (
                create_tiers(fake_financial_aid_programs, int(options["tiers"]))
            )

            recreate_index()
            program_msg = (
                "Created {num} new programs from '{path}'."
            ).format(
                num=len(fake_programs),
                path=PROGRAM_DATA_PATH
            )
            if tiers_created:
                program_msg = "{}\nCreated {} tiers for {} FA-enabled programs".format(
                    program_msg,
                    tiers_created,
                    tiered_program_count
                )
            user_msg = (
                "Created {num} new users from '{path}'."
            ).format(
                num=fake_user_count,
                path=USER_DATA_PATH,
            )
            self.stdout.write(program_msg)
            self.stdout.write(user_msg)

        if fake_programs and options.get('staff_user'):
            self.assign_staff_user_to_programs(options['staff_user'], fake_programs)
            msg = (
                "Added enrollment and 'staff' role for user '{user}' to {num} programs"
            ).format(
                user=options['staff_user'],
                num=len(fake_programs),
            )
            self.stdout.write(msg)
