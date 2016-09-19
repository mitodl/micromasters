"""
Models for course structure
"""
from datetime import datetime

import pytz
from django.db import models


class Program(models.Model):
    """
    A degree someone can pursue, e.g. "Supply Chain Management"
    """
    title = models.CharField(max_length=255)
    live = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)
    financial_aid_availability = models.BooleanField(default=False, null=False)

    def __str__(self):
        return self.title


class Course(models.Model):
    """
    A logical representation of a course, such as "Supply Chain Management
    101". This won't have associated dates or any specific information about a
    given course instance (aka course run), but rather only the things that are
    general across multiple course runs.
    """
    program = models.ForeignKey(Program)
    position_in_program = models.PositiveSmallIntegerField(null=True)

    # These fields will likely make their way into the CMS at some point.
    title = models.CharField(max_length=255)
    thumbnail = models.ImageField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    prerequisites = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.title

    class Meta:
        unique_together = ('program', 'position_in_program',)

    def get_next_run(self):
        """
        Gets the next run associated with this course.
        Note that it could be current as long as the enrollment window
        has not closed.
        """
        next_run_set = self.courserun_set.filter(CourseRun.get_active_enrollment_queryset())
        if not next_run_set.count():
            return
        next_run_set = next_run_set.order_by('start_date')
        return next_run_set[0]


class CourseRun(models.Model):
    """
    An individual run of a course within a Program, e.g. "Supply Chain 101
    - Summer 2017". This is different than the logical notion of a course, but
      rather a specific instance of that course being taught.
    """
    title = models.CharField(max_length=255)
    edx_course_key = models.CharField(max_length=255, blank=True, null=True)
    enrollment_start = models.DateTimeField(blank=True, null=True)
    start_date = models.DateTimeField(blank=True, null=True)
    enrollment_end = models.DateTimeField(blank=True, null=True)
    end_date = models.DateTimeField(blank=True, null=True)
    upgrade_deadline = models.DateTimeField(blank=True, null=True)
    fuzzy_start_date = models.CharField(
        max_length=255, blank=True, null=True,
        help_text="If you don't know when your course will run exactly, "
        "put something here like 'Fall 2019'.")
    fuzzy_enrollment_start_date = models.CharField(
        max_length=255, blank=True, null=True,
        help_text="If you don't know when enrollments "
        "for your course will open exactly, "
        "put something here like 'Fall 2019'.")
    enrollment_url = models.URLField(blank=True, null=True)
    prerequisites = models.TextField(blank=True, null=True)
    course = models.ForeignKey(Course, null=True)

    def __str__(self):
        return self.title

    @property
    def is_current(self):
        """Checks if the course is running now"""
        if not self.start_date:
            return False
        now = datetime.now(pytz.utc)
        if not self.end_date:
            return self.start_date <= now
        return self.start_date <= now <= self.end_date

    @property
    def is_past(self):
        """Checks if the course run in the past"""
        if not self.end_date:
            return False
        return self.end_date < datetime.now(pytz.utc)

    @property
    def is_future(self):
        """Checks if the course will run in the future"""
        if not self.start_date:
            return False
        return self.start_date > datetime.now(pytz.utc)

    @property
    def is_upgradable(self):
        """
        Checks if the course can be upgraded
        A null value means that the upgrade window is always open
        """
        return (self.upgrade_deadline is None or
                (self.upgrade_deadline > datetime.now(pytz.utc)))

    @staticmethod
    def get_active_enrollment_queryset():
        """
        Returns a Q object that encapsulates the logic for filtering for CourseRun objects
        that are active for enrollment.
        """
        now = datetime.now(pytz.utc)
        return (
            # there is only the start date
            (models.Q(enrollment_end=None) &
             models.Q(end_date=None) & models.Q(start_date__lte=now)) |
            # there is no enrollment date but the course has not ended yet
            (models.Q(enrollment_end=None) & models.Q(end_date__gte=now)) |
            # the enrollment end date is simply greater than now
            models.Q(enrollment_end__gte=now)
        )

    def get_course_price(self):
        """
        Returns the current active CoursePrice object attached to this course run.
        """
        return self.courseprice_set.get(is_valid=True)
