"""
Models for dashboard
"""

from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.db.models import (
    CASCADE,
    DateTimeField,
    ForeignKey,
    Model,
    OneToOneField,
    CharField,
)
from edx_api.certificates import (
    Certificate,
    Certificates,
)
from edx_api.enrollments import Enrollments
from edx_api.grades import (
    CurrentGrade,
    CurrentGrades
)

from courses.models import CourseRun, Program
from micromasters.utils import generate_md5


class CachedEdxInfoModel(Model):
    """
    Base class to define other cached models
    """
    user = ForeignKey(User, on_delete=CASCADE)
    course_run = ForeignKey(CourseRun, on_delete=CASCADE)
    data = JSONField()

    class Meta:
        unique_together = (('user', 'course_run'), )
        abstract = True

    @classmethod
    def user_qset(cls, user, program=None):
        """
        Returns a queryset for the records associated with a User

        Args:
            user (User): an User object
            program (Program): optional Program to filter on

        Returns:
            QuerySet: a queryset of all records for the provided user
        """
        query_params = dict(user=user)
        if program is not None:
            query_params.update(dict(course_run__course__program=program))
        return cls.objects.filter(**query_params)

    @classmethod
    def user_course_qset(cls, user, program=None):
        """
        Returns a queryset for the records associated with a User and prefetched Course data

        Args:
            user (User): an User object
            program (Program): optional Program to filter on

        Returns:
            QuerySet: a queryset of all records for the provided user with prefetched Course data
        """
        return cls.user_qset(user, program=program).select_related('course_run__course')

    @classmethod
    def data_qset(cls, user, program=None):
        """
        Returns a queryset containing only the data property for the active records associated with a User

        Args:
            user (User): an User object
            program (Program): optional Program to filter on

        Returns:
            QuerySet: a flattened list queryset of 'data' values
        """
        return cls.user_qset(user, program=program).values_list('data', flat=True)

    @classmethod
    def active_course_ids(cls, user):
        """
        Returns a list of all the Course IDs for the cached data

        Args:
            user (User): an User object

        Returns:
            list: a list of all the course key fields for the provided user
        """
        return list(cls.user_qset(user).values_list('course_run__edx_course_key', flat=True).all())

    @classmethod
    def delete_all_but(cls, user, course_ids_list):
        """
        Given an user, deletes all her object in the cache but the provided course ids

        Args:
            user (User): an User object
            course_ids_list (list): a list of course IDs to NOT be deleted

        Returns:
            None
        """
        cls.user_qset(user).exclude(course_run__edx_course_key__in=course_ids_list).delete()

    @staticmethod
    def deserialize_edx_data(data_iter):
        """
        Instantiates an edX object with some iterable of raw data.
        Must be implemented by specific subclasses.
        """
        raise NotImplementedError

    @classmethod
    def get_edx_data(cls, user, program=None):
        """
        Retrieves the cached data and encapsulates in specific edx-api-client classes.
        """
        return cls.deserialize_edx_data(cls.data_qset(user, program=program))

    @classmethod
    def get_cached_users(cls, course_run):
        """
        Retrieves all the user IDs with entries in the cache for a given course run
        """
        return list(cls.objects.filter(course_run=course_run).values_list('user', flat=True))

    def __str__(self):
        """
        String representation of the model object
        """
        return 'user "{0}", run "{1}"'.format(
            self.user.username,
            self.course_run.edx_course_key,
        )


class CachedEnrollment(CachedEdxInfoModel):
    """
    Model for user enrollment data from edX
    """
    @staticmethod
    def deserialize_edx_data(data_iter):
        """
        Deserializes raw enrollment data

        Args:
            data_iter (iterable): Some iterable of raw data

        Returns: Enrollments: an edX Enrollments object
        """
        return Enrollments(data_iter)


class CachedCertificate(CachedEdxInfoModel):
    """
    Model for certificate data from edX
    """
    @staticmethod
    def deserialize_edx_data(data_iter):
        """
        Deserializes raw certificate data

        Args:
            data_iter (iterable): Some iterable of raw data

        Returns: Certificates: an edX Certificates object
        """
        return Certificates([
            Certificate(data) for data in data_iter
        ])


class CachedCurrentGrade(CachedEdxInfoModel):
    """
    Model for current grade data from edX
    """
    @staticmethod
    def deserialize_edx_data(data_iter):
        """
        Deserializes raw current grade data

        Args:
            data_iter (iterable): Some iterable of raw data

        Returns: CachedCurrentGrade: an edX CachedCurrentGrade object
        """
        return CurrentGrades([
            CurrentGrade(data) for data in data_iter
        ])


class UserCacheRefreshTime(Model):
    """
    Model to store the last refresh timestamp for each of the edX cached info model.
    """
    user = OneToOneField(User, on_delete=CASCADE)
    enrollment = DateTimeField(null=True)
    certificate = DateTimeField(null=True)
    current_grade = DateTimeField(null=True)

    def __str__(self):
        """
        String representation of the model object
        """
        return 'user "{0}"'.format(self.user.username)


class ProgramEnrollment(Model):
    """
    Model for student enrollments in Programs
    """
    user = ForeignKey(User, on_delete=CASCADE)
    program = ForeignKey(Program, on_delete=CASCADE)
    hash = CharField(max_length=32, null=False, unique=True)

    class Meta:
        unique_together = (('user', 'program'), )

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        """Overridden save method"""
        if not self.hash:
            self.hash = generate_md5(
                '{}|{}'.format(self.user_id, self.program_id).encode('utf-8')
            )
        super().save(*args, **kwargs)

    @classmethod
    def prefetched_qset(cls):
        """
        Returns a queryset that will prefetch Program and User (with Profile)
        """
        return cls.objects.select_related('user__profile', 'program')

    def __str__(self):
        """
        String representation of the model object
        """
        return 'user "{0}" enrolled in program "{1}"'.format(
            self.user.username,
            self.program.title
        )
