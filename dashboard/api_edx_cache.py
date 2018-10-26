"""
APIs that deal with the edx cached data
"""
import datetime
import logging
from collections import namedtuple

from django.db import transaction
from django.conf import settings
from requests.exceptions import HTTPError
from edx_api.client import EdxApi

from backends import utils
from backends.exceptions import InvalidCredentialStored
from courses.models import CourseRun
from dashboard import models
from micromasters.utils import now_in_utc
from profiles.api import get_social_username, get_social_auth
from search import tasks

log = logging.getLogger(__name__)

UserCachedRunData = namedtuple(
    'UserCachedRunData', ['edx_course_key', 'enrollment', 'certificate', 'current_grade'])


class CachedEdxUserData:
    """Represents all edX data related to a User"""
    # pylint: disable=too-many-instance-attributes

    def __init__(self, user, program=None):
        """
        Fetches the given User's edx data and sets object properties

        Args:
            user (User): a User object
            program (Program): an optional Program to filter on
        """
        self.user = user
        self.program = program
        self.enrollments = models.CachedEnrollment.get_edx_data(self.user, program=self.program)
        self.certificates = models.CachedCertificate.get_edx_data(self.user, program=self.program)
        self.current_grades = models.CachedCurrentGrade.get_edx_data(self.user, program=self.program)

    def get_run_data(self, course_id):
        """
        Returns cached data for the user in a specific course run

        Args:
            course_id (str): a string representing the edx course key for a course run

        Returns:
            UserCachedRunData: a namedtuple containing the cached data for the user in the course run
        """
        return UserCachedRunData(
            edx_course_key=course_id,
            enrollment=self.enrollments.get_enrollment_for_course(course_id),
            certificate=self.certificates.get_cert(course_id),
            current_grade=self.current_grades.get_current_grade(course_id),
        )


class CachedEdxDataApi:
    """
    Class to handle the retrieval and update of the users' cached edX information
    """

    ENROLLMENT = 'enrollment'
    CERTIFICATE = 'certificate'
    CURRENT_GRADE = 'current_grade'

    # the sorting of the supported caches matters for refresh
    SUPPORTED_CACHES = (ENROLLMENT, CERTIFICATE, CURRENT_GRADE,)

    CACHED_EDX_MODELS = {
        ENROLLMENT: models.CachedEnrollment,
        CERTIFICATE: models.CachedCertificate,
        CURRENT_GRADE: models.CachedCurrentGrade,
    }

    CACHE_EXPIRATION_DELTAS = {
        ENROLLMENT:  datetime.timedelta(minutes=5),
        CERTIFICATE: datetime.timedelta(hours=6),
        CURRENT_GRADE: datetime.timedelta(hours=1),
    }

    @classmethod
    def get_cached_edx_data(cls, user, cache_type):
        """
        Helper function to return cached data.

        Args:
            user (django.contrib.auth.models.User): A user
            cache_type (str): a string representing one of the cached data types
        Returns:
            Enrollments or Certificates or CurrentGrades
        """
        if cache_type not in cls.SUPPORTED_CACHES:
            raise ValueError("{} is an unsupported cache type".format(cache_type))
        return cls.CACHED_EDX_MODELS[cache_type].get_edx_data(user)

    @classmethod
    def update_cache_last_access(cls, user, cache_type, timestamp=None):
        """
        Updates the UserCacheRefreshTime model timestamp for the provided cache type

        Args:
            user (django.contrib.auth.models.User): A user
            cache_type (str): a string representing one of the cached data types
            timestamp (datetime.datetime): a timestamp
        Returns:
            None
        """
        if cache_type not in cls.SUPPORTED_CACHES:
            raise ValueError("{} is an unsupported cache type".format(cache_type))
        if timestamp is None:
            timestamp = now_in_utc()
        updated_values = {
            'user': user,
            cache_type: timestamp,
        }
        models.UserCacheRefreshTime.objects.update_or_create(user=user, defaults=updated_values)

    @classmethod
    def is_cache_fresh(cls, user, cache_type):
        """
        Checks if the specified cache type is fresh.

        Args:
            user (django.contrib.auth.models.User): A user
            cache_type (str): a string representing one of the cached data types
        Returns:
            bool
        """
        if cache_type not in cls.SUPPORTED_CACHES:
            raise ValueError("{} is an unsupported cache type".format(cache_type))
        try:
            cache_timestamps = models.UserCacheRefreshTime.objects.get(user=user)
        except models.UserCacheRefreshTime.DoesNotExist:
            return False
        cache_timestamp = getattr(cache_timestamps, cache_type)
        return cache_timestamp is not None and cache_timestamp > (
            now_in_utc() - cls.CACHE_EXPIRATION_DELTAS[cache_type]
        )

    @classmethod
    def are_all_caches_fresh(cls, user):
        """
        Checks if all cache types are fresh.

        Args:
            user (django.contrib.auth.models.User): A user
        Returns:
            bool
        """
        return all(cls.is_cache_fresh(user, cache_type) for cache_type in cls.SUPPORTED_CACHES)

    @classmethod
    def update_cached_enrollment(cls, user, enrollment, course_id, index_user=False):
        """
        Updates the cached enrollment based on an Enrollment object

        Args:
            user (User): A user
            enrollment (Enrollment): An Enrollment object from edx_api_client
            course_id (str): A course key
            index_user (bool): whether to force an user re-index.
                This is only necessary if this function is called from outside the general
                global user enrollments refresh.

        Returns:
            None
        """
        with transaction.atomic():
            # get the enrollment data
            enrollment_data = enrollment.json
            course_run = CourseRun.objects.get(edx_course_key=course_id)
            updated_values = {
                'user': user,
                'course_run': course_run,
                'data': enrollment_data,
            }
            models.CachedEnrollment.objects.update_or_create(
                user=user,
                course_run=course_run,
                defaults=updated_values
            )
        if index_user:
            # submit a celery task to reindex the user
            tasks.index_users.delay([user.id], check_if_changed=True)

    @classmethod
    def update_cached_enrollments(cls, user, edx_client):
        """
        Updates cached enrollment data for an user.

        Args:
            user (django.contrib.auth.models.User): A user
            edx_client (EdxApi): EdX client to retrieve enrollments
        Returns:
            None
        """
        # Fetch new data from edX.
        enrollments = edx_client.enrollments.get_student_enrollments()

        # Make sure all cached enrollments are updated atomically
        with transaction.atomic():
            # update the current ones
            all_enrolled_course_ids = enrollments.get_enrolled_course_ids()
            for course_run in CourseRun.objects.filter(edx_course_key__in=all_enrolled_course_ids):
                enrollment = enrollments.get_enrollment_for_course(course_run.edx_course_key)
                cls.update_cached_enrollment(user, enrollment, course_run.edx_course_key)
            # delete anything is not in the current enrollments
            models.CachedEnrollment.delete_all_but(user, all_enrolled_course_ids)
            # update the last refresh timestamp
            cls.update_cache_last_access(user, cls.ENROLLMENT)
        # submit a celery task to reindex the user
        tasks.index_users.delay([user.id], check_if_changed=True)

    @classmethod
    def update_cached_certificates(cls, user, edx_client):
        """
        Updates cached certificate data.

        Args:
            user (django.contrib.auth.models.User): A user
            edx_client (EdxApi): EdX client to retrieve enrollments
        Returns:
            None
        """
        # the possible certificates can be only for courses where the user is enrolled
        course_ids = models.CachedEnrollment.active_course_ids(user)

        # Certificates are out of date, so fetch new data from edX.
        certificates = edx_client.certificates.get_student_certificates(
            get_social_username(user), course_ids)

        # This must be done atomically
        with transaction.atomic():
            all_cert_course_ids = certificates.all_courses_verified_certs
            for course_run in CourseRun.objects.filter(edx_course_key__in=all_cert_course_ids):
                certificate = certificates.get_verified_cert(course_run.edx_course_key)
                updated_values = {
                    'user': user,
                    'course_run': course_run,
                    'data': certificate.json,
                }
                models.CachedCertificate.objects.update_or_create(
                    user=user,
                    course_run=course_run,
                    defaults=updated_values
                )
            # delete anything is not in the current certificates
            models.CachedCertificate.delete_all_but(user, all_cert_course_ids)
            # update the last refresh timestamp
            cls.update_cache_last_access(user, cls.CERTIFICATE)
        # submit a celery task to reindex the user
        tasks.index_users.delay([user.id], check_if_changed=True)

    @classmethod
    def update_cached_current_grades(cls, user, edx_client):
        """
        Updates cached current grade data.

        Args:
            user (django.contrib.auth.models.User): A user
            edx_client (EdxApi): EdX client to retrieve enrollments
        Returns:
            None
        """

        course_ids = models.CachedEnrollment.active_course_ids(user)

        # Current Grades are out of date, so fetch new data from edX.
        current_grades = edx_client.current_grades.get_student_current_grades(
            get_social_username(user), course_ids)

        # the update must be done atomically
        with transaction.atomic():
            all_grade_course_ids = current_grades.all_course_ids
            for course_run in CourseRun.objects.filter(edx_course_key__in=all_grade_course_ids):
                current_grade = current_grades.get_current_grade(course_run.edx_course_key)
                updated_values = {
                    'user': user,
                    'course_run': course_run,
                    'data': current_grade.json,
                }
                models.CachedCurrentGrade.objects.update_or_create(
                    user=user,
                    course_run=course_run,
                    defaults=updated_values
                )
            # delete anything is not in the current grades
            models.CachedCurrentGrade.delete_all_but(user, all_grade_course_ids)
            # update the last refresh timestamp
            cls.update_cache_last_access(user, cls.CURRENT_GRADE)
        # submit a celery task to reindex the user
        tasks.index_users.delay([user.id], check_if_changed=True)

    @classmethod
    def update_cache_if_expired(cls, user, edx_client, cache_type):
        """
        Checks if the specified cache type is expired and in case takes care to update it.

        Args:
            user (django.contrib.auth.models.User): A user
            edx_client (EdxApi): EdX client to retrieve enrollments
            cache_type (str): a string representing one of the cached data types
        Returns:
            None
        """
        cache_update_methods = {
            cls.ENROLLMENT: cls.update_cached_enrollments,
            cls.CERTIFICATE: cls.update_cached_certificates,
            cls.CURRENT_GRADE: cls.update_cached_current_grades,
        }
        if cache_type not in cls.SUPPORTED_CACHES:
            raise ValueError("{} is an unsupported cache type".format(cache_type))
        if not cls.is_cache_fresh(user, cache_type):
            update_func = cache_update_methods[cache_type]
            try:
                update_func(user, edx_client)
            except HTTPError as exc:
                if exc.response.status_code in (400, 401,):
                    raise InvalidCredentialStored(
                        message='Received a {} status code from the server even'
                        ' if access token was supposed to be valid'.format(exc.response.status_code),
                        http_status_code=exc.response.status_code
                    )
                raise

    @classmethod
    def update_all_cached_grade_data(cls, user):
        """
        Updates only certificates and Current grade.
        Used before a final grade freeze.

        Args:
            user (django.contrib.auth.models.User): A user
        Returns:
            None
        """
        # get the credentials for the current user for edX
        user_social = get_social_auth(user)
        utils.refresh_user_token(user_social)
        # create an instance of the client to query edX
        edx_client = EdxApi(user_social.extra_data, settings.EDXORG_BASE_URL)
        cls.update_cached_certificates(user, edx_client)
        cls.update_cached_current_grades(user, edx_client)
