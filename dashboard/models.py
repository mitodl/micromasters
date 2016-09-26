"""
Models for dashboard
"""

from django.contrib.auth.models import User
from django.db.models import (
    DateTimeField,
    ForeignKey,
    Model,
)
from jsonfield import JSONField

from courses.models import CourseRun, Program


class CachedEdxInfoModel(Model):
    """
    Base class to define other cached models
    """
    user = ForeignKey(User)
    course_run = ForeignKey(CourseRun)
    data = JSONField(null=True)
    last_request = DateTimeField()

    class Meta:
        unique_together = (('user', 'course_run'), )
        abstract = True

    def __str__(self):
        """
        String representation of the model object
        """
        return 'user "{0}", run "{1}", has_data={2}'.format(
            self.user.username,
            self.course_run.edx_course_key,
            self.data is not None,
        )


class CachedEnrollment(CachedEdxInfoModel):
    """
    Model for user enrollment data from edX
    """
    @classmethod
    def active_count(cls, user, program):
        """
        Returns the number of active CachedEnrollments for a User/Program pair
        """
        return cls.objects.filter(
            user=user,
            course_run__course__program=program
        ).exclude(data__isnull=True).count()


class CachedCertificate(CachedEdxInfoModel):
    """
    Model for certificate data from edX
    """


class CachedCurrentGrade(CachedEdxInfoModel):
    """
    Model for current grade data from edX
    """


class ProgramEnrollment(Model):
    """
    Model for student enrollments in Programs
    """
    user = ForeignKey(User)
    program = ForeignKey(Program)

    class Meta:
        unique_together = (('user', 'program'), )

    def __str__(self):
        """
        String representation of the model object
        """
        return 'user "{0}" enrolled in program "{1}"'.format(
            self.user.username,
            self.program.title
        )
