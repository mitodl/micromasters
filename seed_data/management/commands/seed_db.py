"""
Generates a set of realistic users/programs to help us test search functionality
"""
from datetime import datetime, timedelta
from django.core.management import BaseCommand
from django.contrib.auth.models import User

from backends.edxorg import EdxOrgOAuth2
from courses.models import Program, Course, CourseRun
from dashboard.models import ProgramEnrollment, CachedCertificate, CachedEnrollment
from ecommerce.models import CoursePrice
from micromasters.utils import (
    get_field_names,
    load_json_from_file,
)
from profiles.api import get_social_username
from profiles.models import Employment, Education
from roles.models import Role
from roles.roles import Staff
from search.indexing_api import recreate_index
from seed_data.management.commands import (  # pylint: disable=import-error
    USER_DATA_PATH, PROGRAM_DATA_PATH,
    FAKE_USER_USERNAME_PREFIX, FAKE_PROGRAM_DESC_PREFIX
)


# Util functions

def first_matching_item(iterable, predicate):
    """Returns the first item in an iterable that matches a given predicate"""
    return next(x for x in iterable if predicate(x))


def filter_dict_by_key_set(dict_to_filter, key_set):
    """
    Takes a dictionary and returns a copy without keys that don't exist in a given set
    """
    return {key: dict_to_filter[key] for key in dict_to_filter.keys() if key in key_set}


def deserialize_model_data_on_object(model_obj, data, save=True):
    """
    Sets field values on an existing model object using some supplied data
    """
    non_relation_field_names = get_field_names(model_obj.__class__)
    for k, v in filter_dict_by_key_set(data, non_relation_field_names).items():
        setattr(model_obj, k, v)
    if save:
        model_obj.save()
    return model_obj


def deserialize_model_data(model_cls, data, relational_data=None):
    """
    Creates a new instance of a model class and fills in field values using some supplied data
    """
    non_relation_field_names = get_field_names(model_cls)
    model_data = filter_dict_by_key_set(data, non_relation_field_names)
    if relational_data:
        model_data.update(relational_data)
    return model_cls.objects.create(**model_data)


# User data deserialization

class CachedModelDeserializer:
    """
    Base class for deserializing a model used for edX data caching (eg: Enrollments, Certificates)
    """
    model_cls = None

    @classmethod
    def _get_edx_course_key(cls, data):   # pylint: disable=unused-argument
        """Gets the edx_course_key value from the data dictionary"""
        raise NotImplementedError

    @classmethod
    def _fill_in_missing_data(cls, data, user, course_run):   # pylint: disable=unused-argument
        """Fills in data using the associated User and CourseRun objects"""
        raise NotImplementedError

    @classmethod
    def deserialize(cls, user, data, course_runs):
        """
        Creates a new cached model object and returns the associated CourseRun
        """
        edx_course_key = cls._get_edx_course_key(data)
        course_run = first_matching_item(course_runs, lambda cr: cr.edx_course_key == edx_course_key)
        data = cls._fill_in_missing_data(data, user, course_run)
        cls.model_cls.objects.create(
            user=user,
            course_run=course_run,
            data=data,
            last_request=datetime.now() + timedelta(days=365)
        )
        return course_run


class CertificateDeserializer(CachedModelDeserializer):
    """
    CachedCertificate deserializer
    """

    model_cls = CachedCertificate
    data_key = 'certificates'

    @classmethod
    def _get_edx_course_key(cls, data):
        return data['course_id']

    @classmethod
    def _fill_in_missing_data(cls, data, user, course_run):
        data['username'] = get_social_username(user)
        return data


class EnrollmentDeserializer(CachedModelDeserializer):
    """
    CachedEnrollment deserializer
    """

    model_cls = CachedEnrollment
    data_key = 'enrollments'

    @classmethod
    def _get_edx_course_key(cls, data):
        return data['course_details']['course_id']

    @classmethod
    def _fill_in_missing_data(cls, data, user, course_run):
        data['user'] = get_social_username(user)
        data['course_details'].update({
            'course_start': course_run.start_date.isoformat(),
            'course_end': course_run.end_date.isoformat(),
            'enrollment_start': course_run.enrollment_start.isoformat(),
            'enrollment_end': course_run.enrollment_end.isoformat()
        })
        return data


CACHED_MODEL_DESERIALIZERS = [EnrollmentDeserializer, CertificateDeserializer]


def deserialize_user_data(user_data, course_runs):
    """
    Deserializes a dict of mixed User/Profile data and returns the newly-inserted User
    """
    user_model_data = user_data.copy()
    user_model_data.update(
        dict(
            username=FAKE_USER_USERNAME_PREFIX + user_data['email'].split('@')[0],
            is_active=True,
            is_staff=False,
            is_superuser=False
        )
    )
    user = deserialize_model_data(User, user_model_data)
    # Create social username
    user.social_auth.create(
        provider=EdxOrgOAuth2.name,
        uid=user.username,
    )
    # Create new cached edX data records for each type we care about and associate them with a User and CourseRun
    for cached_model_deserializer in CACHED_MODEL_DESERIALIZERS:
        if cached_model_deserializer.data_key in user_data:
            accounted_course_runs = [
                cached_model_deserializer.deserialize(user, data, course_runs)
                for data in user_data[cached_model_deserializer.data_key]
            ]
            unaccounted_course_runs = set(course_runs) - set(accounted_course_runs)
            # Add a ProgramEnrollment for this user/program combination if it doesn't exist yet
            program = accounted_course_runs[0].course.program
            ProgramEnrollment.objects.get_or_create(user=user, program=program)
        else:
            unaccounted_course_runs = course_runs
        # For each course run that didn't have associated cached edX data (for Enrollments, Certificates, etc),
        # create an 'empty' record (data=None)
        for course_run in unaccounted_course_runs:
            cached_model_deserializer.model_cls.objects.create(
                user=user,
                course_run=course_run,
                last_request=datetime.now() + timedelta(days=365)
            )
    return user


def deserialize_profile_detail_data(profile, model_cls, profile_detail_data):
    """
    Deserializes a list of data for a model with a many-to-one relationship with Profile (eg: Education)
    """
    for profile_detail in profile_detail_data:
        deserialize_model_data(model_cls, profile_detail, dict(profile=profile))


def deserialize_user_data_list(user_data_list, course_runs):
    """
    Deserializes a list of user data and returns the count of new Users created
    """
    new_user_count = 0
    for user_data in user_data_list:
        new_user = deserialize_user_data(user_data, course_runs)
        new_user_count += 1
        deserialize_model_data_on_object(new_user.profile, user_data)
        deserialize_profile_detail_data(new_user.profile, Employment, user_data['work_history'])
        deserialize_profile_detail_data(new_user.profile, Education, user_data['education'])
    return new_user_count


# Program data deserialization

def deserialize_course_price_data(course_run, course_price_data):
    """Deserializes a CoursePrice object"""
    # set `is_valid` to True, so we don't have to specify it in the JSON file
    course_price_data["is_valid"] = True
    course_price = deserialize_model_data(
        CoursePrice, course_price_data, dict(course_run=course_run)
    )
    return course_price


def deserialize_course_run_data(course, course_run_data):
    """Deserializes a CourseRun object"""
    course_price_data = course_run_data.pop('course_price')
    course_run = deserialize_model_data(
        CourseRun, course_run_data, dict(course=course)
    )
    deserialize_course_price_data(course_run, course_price_data)
    return course_run


def deserialize_course_data(program, course_data):
    """Deserializes a Course object"""
    course = deserialize_model_data(Course, course_data, dict(program=program))
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
        programs.append(deserialize_program_data(program_data))
    return programs


class Command(BaseCommand):
    """
    Seed the database with a set of realistic data, for development purposes.
    """
    help = "Seed the database with a set of realistic data, for development purposes."

    def add_arguments(self, parser):
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

    def handle(self, *args, **options):
        program_data_list = load_json_from_file(PROGRAM_DATA_PATH)
        user_data_list = load_json_from_file(USER_DATA_PATH)
        existing_fake_user_count = User.objects.filter(username__startswith=FAKE_USER_USERNAME_PREFIX).count()
        existing_fake_program_count = Program.objects.filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX).count()
        if len(user_data_list) == existing_fake_user_count and len(program_data_list) == existing_fake_program_count:
            fake_programs = Program.objects.filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX).all()
            self.stdout.write("Seed data appears to already exist.")
        else:
            recreate_index()
            fake_programs = deserialize_program_data_list(program_data_list)
            fake_course_runs = CourseRun.objects.filter(
                course__program__description__contains=FAKE_PROGRAM_DESC_PREFIX
            ).all()
            fake_user_count = deserialize_user_data_list(user_data_list, fake_course_runs)
            recreate_index()
            program_msg = (
                "Created {num} new programs from '{path}'."
            ).format(
                num=len(fake_programs),
                path=PROGRAM_DATA_PATH
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
