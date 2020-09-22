"""
Models for exams
"""
from django.contrib.auth.models import User
from django.db import models

from micromasters.models import TimestampedModel
from micromasters.utils import now_in_utc


class ExamRun(TimestampedModel):
    """Represents an individual run of an exam"""
    course = models.ForeignKey('courses.Course', related_name='exam_runs', on_delete=models.CASCADE)
    exam_series_code = models.CharField(max_length=20)
    description = models.TextField(null=True, blank=True)
    semester = models.CharField(max_length=50, null=True, blank=True)

    date_first_schedulable = models.DateTimeField()
    date_last_schedulable = models.DateTimeField()

    date_first_eligible = models.DateField()
    date_last_eligible = models.DateField()

    date_grades_available = models.DateTimeField()

    authorized = models.BooleanField(default=False)

    @classmethod
    def get_currently_schedulable(cls, course):
        """
        Get a QuerySet with currently schedulable exam runs

        Args:
            course (courses.models.Course): the course to find exam runs for

        Returns:
            django.db.models.query.QuerySet: A Queryset filtered to currently schedulable exam runs
        """
        now = now_in_utc()
        return cls.objects.filter(
            course=course,
            date_first_schedulable__lte=now,
            date_last_schedulable__gte=now,
        )

    @classmethod
    def get_schedulable_in_future(cls, course):
        """
        Get a QuerySet with currently schedulable exam runs

        Args:
            course (courses.models.Course): the course to find exam runs for

        Returns:
            django.db.models.query.QuerySet: A Queryset filtered to currently schedulable exam runs
        """
        now = now_in_utc()
        return cls.objects.filter(
            course=course,
            date_first_schedulable__gte=now
        )

    def __str__(self):
        return 'Exam run for course "{}" with exam series code "{}"'.format(
            self.course.title,
            self.exam_series_code
        )

    @classmethod
    def get_schedulable_in_past(cls, course):
        """
        Get a QuerySet with recently expired scheduling time

        Args:
            course (courses.models.Course): the course to find exam runs for

        Returns:
            django.db.models.query.QuerySet: A Queryset filtered to past exam runs
        """
        now = now_in_utc()
        return cls.objects.filter(
            course=course,
            date_last_schedulable__lt=now
        )

    @property
    def is_schedulable(self):
        """
        Determines if the run is schedulable or not

        Returns:
            bool: True if the exam run is currently schedulable
        """
        now = now_in_utc()
        return self.date_first_schedulable <= now < self.date_last_schedulable

    @property
    def has_authorizations(self):
        """
        Determines if the run has authorizations

        Returns:
            bool: True if authorizations exist
        """
        return self.exam_authorizations.exists()


class ExamProfile(TimestampedModel):
    """
    Profile model to track syncing this data to the remote

    We need to sync profile data to Pearson. This model tracks the state of that syncing.
    It corresponds to a row in a Pearson CDD file.

    ExamProfile.status is a state machine following this flow:

                   pending
                  /       \
            in-progress   invalid
             /       \
         success   failed

    The state machine can transition to the root node from any other node to restart the flow
    """
    PROFILE_INVALID = 'invalid'
    PROFILE_PENDING = 'pending'
    PROFILE_IN_PROGRESS = 'in-progress'
    PROFILE_FAILED = 'failed'
    PROFILE_SUCCESS = 'success'

    PROFILE_ABSENT = 'absent'
    PROFILE_SCHEDULABLE = 'schedulable'

    PROFILE_STATUS_CHOICES = (
        (PROFILE_PENDING, 'Sync Pending'),
        (PROFILE_IN_PROGRESS, 'Sync in Progress'),
        (PROFILE_FAILED, 'Sync Failed'),
        (PROFILE_SUCCESS, 'Sync Succeeded'),
        (PROFILE_INVALID, 'Profile Invalid'),
    )

    profile = models.OneToOneField(
        'profiles.Profile',
        related_name='exam_profile',
        on_delete=models.CASCADE,
    )
    status = models.CharField(
        max_length=30,
        null=False,
        choices=PROFILE_STATUS_CHOICES,
        default=PROFILE_PENDING,
    )

    def __str__(self):
        return 'Exam Profile "{0}" with status "{1}"'.format(self.id, self.status)


class ExamAuthorization(TimestampedModel):
    """
    Tracks state of an exam authorization

    Exam Authorization record are sent to Pearson authorizing an individual for a specific exam.
    This model exists so we can track state on our side and corresponds to a row in a Pearson EAD file.

    ExamAuthorization.status is a state machine following this flow:

              pending
                 |
              sending
                 |
            in-progress
             /       \
         success   failed

    The state machine can transition to the root node from any other node to restart the flow
    """
    OPERATION_ADD = 'add'
    OPERATION_DELETE = 'delete'
    OPERATION_UPDATE = 'update'

    OPERATION_CHOICES = tuple((op, op.capitalize()) for op in [
        OPERATION_ADD,
        OPERATION_UPDATE,
        OPERATION_DELETE,
    ])

    STATUS_PENDING = 'pending'
    STATUS_SENDING = 'sending'
    STATUS_IN_PROGRESS = 'in-progress'
    STATUS_FAILED = 'failed'
    STATUS_SUCCESS = 'success'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Sync Pending'),
        (STATUS_SENDING, 'Sync Sending'),
        (STATUS_IN_PROGRESS, 'Sync in Progress'),
        (STATUS_FAILED, 'Sync Failed'),
        (STATUS_SUCCESS, 'Sync Suceeded'),
    )

    user = models.ForeignKey(User, related_name='exam_authorizations', on_delete=models.CASCADE)
    course = models.ForeignKey('courses.Course', related_name='exam_authorizations', on_delete=models.CASCADE)
    exam_run = models.ForeignKey(ExamRun, related_name='exam_authorizations', on_delete=models.CASCADE)

    operation = models.CharField(
        max_length=30,
        null=False,
        choices=OPERATION_CHOICES,
        default=OPERATION_ADD,
    )
    status = models.CharField(
        max_length=30,
        null=False,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    exam_taken = models.BooleanField(default=False)
    exam_no_show = models.BooleanField(default=False)
    exam_coupon_url = models.URLField(blank=True, null=True)

    @classmethod
    def taken_exams(cls):
        """Returns a QuerySet for taken exams"""
        return cls.objects.filter(exam_taken=True)

    def __str__(self):
        return 'Exam Authorization "{0}" with status "{1}" for user {2}'.format(
            self.id,
            self.status,
            self.user_id
        )
