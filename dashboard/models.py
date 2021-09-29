"""
Models for dashboard
"""
import uuid

from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.db.models import (
    CASCADE,
    DateTimeField,
    ForeignKey,
    Model,
    OneToOneField,
    CharField,
    Manager,
)
from edx_api.certificates import (
    Certificate,
    Certificates,
)
from edx_api.enrollments import Enrollments
from edx_api.grades import (
    CurrentGrade,
    CurrentGradesByUser
)

from courses.models import CourseRun, Program
from mail.models import PartnerSchool
from micromasters.models import TimestampedModel


class CachedEdxInfoModelManager(Manager):
    """Custom model manager"""
    def get_queryset(self):
        """Filter out records associated with discontinued runs"""
        return super().get_queryset().exclude(course_run__is_discontinued=True)

class CachedEdxInfoModel(Model):
    """
    Base class to define other cached models
    """
    objects = CachedEdxInfoModelManager()

    user = ForeignKey(User, on_delete=CASCADE)
    course_run = ForeignKey(CourseRun, on_delete=CASCADE)
    data = JSONField()

    class Meta:
        unique_together = (('user', 'course_run'), )
        abstract = True

    @classmethod
    def user_qset(cls, user, program=None, provider=None):
        """
        Returns a queryset for the records associated with a User

        Args:
            provider (str): name of the courseware backend
            user (User): an User object
            program (Program): optional Program to filter on

        Returns:
            QuerySet: a queryset of all records for the provided user
        """
        query_set = cls.objects.filter(user=user)
        if program is not None:
            query_set = query_set.filter(course_run__course__program=program)
        if provider is not None:
            query_set = query_set.filter(course_run__courseware_backend=provider)
        return query_set

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
    def active_course_ids(cls, user, provider):
        """
        Returns a list of all the Course IDs for the cached data
        for a given provider only

        Args:
            provider (str): name of the courseware backend
            user (User): an User object

        Returns:
            list: a list of all the course key fields for the provided user
        """
        return list(cls.user_qset(user, provider=provider).values_list('course_run__edx_course_key', flat=True).all())

    @classmethod
    def delete_all_but(cls, user, course_ids_list, provider):
        """
        Given an user, deletes all her object in the cache but the provided course ids for a given
        provider

        Args:
            provider (str): name of the courseware backend
            user (User): an User object
            course_ids_list (list): a list of course IDs to NOT be deleted

        Returns:
            None
        """
        cls.user_qset(user, provider=provider).exclude(course_run__edx_course_key__in=course_ids_list).delete()

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
        return CurrentGradesByUser([
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
    enrollment_mitxonline = DateTimeField(null=True)
    current_grade_mitxonline = DateTimeField(null=True)

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
    share_hash = CharField(max_length=36, null=True, unique=True)

    class Meta:
        unique_together = (('user', 'program'), )

    def get_share_hash(self):
        """
        Generates (if not already generated) and returns the share_hash
        """
        if not self.share_hash:
            self.share_hash = str(uuid.uuid4())
            self.save()
        return self.share_hash

    def revoke_share_hash(self):
        """
        Removes share_hash of current object
        """
        self.share_hash = None
        self.save()

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


class MicromastersLearnerRecordShare(TimestampedModel):
    """
    Model for learner record sharing
    """
    user = ForeignKey(User, on_delete=CASCADE)
    program = ForeignKey(Program, on_delete=CASCADE)
    partner_school = ForeignKey(PartnerSchool, on_delete=CASCADE)

    class Meta:
        unique_together = ('user', 'program', 'partner_school')
