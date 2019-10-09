"""
Models for course structure
"""
import logging
import urllib.parse

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models

from grades.constants import FinalGradeStatus
from micromasters.models import TimestampedModel
from micromasters.utils import (
    first_matching_item,
    now_in_utc,
)


log = logging.getLogger(__name__)


class Topic(models.Model):
    """
    Topic for a program
    """
    name = models.CharField(max_length=128, unique=True)

    def __str__(self):
        return self.name


class Program(TimestampedModel):
    """
    A degree someone can pursue, e.g. "Supply Chain Management"
    """
    title = models.CharField(max_length=255)
    live = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)
    financial_aid_availability = models.BooleanField(default=False, null=False)
    ga_tracking_id = models.CharField(max_length=255, blank=True, default="")
    num_required_courses = models.PositiveSmallIntegerField(null=False)
    price = models.DecimalField(decimal_places=2, max_digits=20)
    topics = models.ManyToManyField(Topic, blank=True, related_name="topics")

    def __str__(self):
        return self.title

    def has_frozen_grades_for_all_courses(self):
        """
        Return true if has frozen grades for all courses in the program
        """
        return all([course.has_frozen_runs() for course in self.course_set.all()])


class Course(models.Model):
    """
    A logical representation of a course, such as "Supply Chain Management
    101". This won't have associated dates or any specific information about a
    given course instance (aka course run), but rather only the things that are
    general across multiple course runs.
    """
    program = models.ForeignKey(Program, on_delete=models.CASCADE)
    position_in_program = models.PositiveSmallIntegerField()

    edx_key = models.CharField(max_length=50, null=True, blank=True)

    # These fields will likely make their way into the CMS at some point.
    title = models.CharField(max_length=255)
    course_number = models.TextField(blank=True, null=True)
    thumbnail = models.ImageField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    prerequisites = models.TextField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    should_display_progress = models.BooleanField(default=True)

    def __str__(self):
        return self.title

    class Meta:
        unique_together = ('program', 'position_in_program',)
        ordering = ('position_in_program',)

    def get_promised_run(self):
        """
        Get a run that does not have start_date,
        only fuzzy_start_date
        """
        return self.courserun_set.filter(
            models.Q(start_date=None) & models.Q(fuzzy_start_date__isnull=False)
        ).first()

    @property
    def url(self):
        """
        Construct the course page url
        """
        course_run = self.first_unexpired_run()
        if not course_run:
            return ""
        if course_run.enrollment_url:
            return course_run.enrollment_url
        if not course_run.edx_course_key:
            return ""
        return urllib.parse.urljoin(
            settings.EDXORG_BASE_URL,
            'courses/{key}/about'.format(key=course_run.edx_course_key)
        )

    @property
    def has_exam(self):
        """
        Check if the course has any exam runs associated with it
        """
        return self.exam_runs.exists()

    @property
    def enrollment_text(self):
        """
        Return text that contains start and enrollment
        information about the course.
        """
        course_run = self.first_unexpired_run()
        if not course_run or not course_run.start_date:
            promised_run = self.get_promised_run()
            if promised_run:
                return "Coming " + promised_run.fuzzy_start_date
            else:
                return "Not available"

        if course_run.is_current:
            if course_run.enrollment_end:
                end_text = 'Enrollment Ends {:%b %-d, %Y}'.format(
                    course_run.enrollment_end
                )
            else:
                end_text = 'Enrollment Open'
            return "Ongoing - {end}".format(end=end_text)
        elif course_run.is_future:
            if course_run.is_future_enrollment_open:
                end_text = ' - Enrollment Open'
            elif course_run.enrollment_start:
                end_text = ' - Enrollment {:%m/%Y}'.format(
                    course_run.enrollment_start
                )
            else:
                end_text = ''
            return "Starts {start:%b %-d, %Y}{end}".format(
                start=course_run.start_date,
                end=end_text,
            )
        else:
            return "Not available"

    def has_frozen_runs(self):
        """
        Return true if has any frozen runs
        """
        return any([run.has_frozen_grades for run in self.courserun_set.all()])

    def first_unexpired_run(self):
        """
        Gets the first unexpired CourseRun associated with this Course

        Returns: CourseRun or None: An unexpired course run
        """
        return first_matching_item(
            self.courserun_set.all(),
            lambda course_run: course_run.is_unexpired
        )


class CourseRun(models.Model):
    """
    An individual run of a course within a Program, e.g. "Supply Chain 101
    - Summer 2017". This is different than the logical notion of a course, but
      rather a specific instance of that course being taught.
    """
    title = models.CharField(max_length=255)
    edx_course_key = models.CharField(max_length=255, blank=True, null=True, unique=True)
    enrollment_start = models.DateTimeField(blank=True, null=True, db_index=True)
    start_date = models.DateTimeField(blank=True, null=True, db_index=True)
    enrollment_end = models.DateTimeField(blank=True, null=True, db_index=True)
    end_date = models.DateTimeField(blank=True, null=True, db_index=True)
    upgrade_deadline = models.DateTimeField(blank=True, null=True, db_index=True)
    freeze_grade_date = models.DateTimeField(blank=True, null=True, db_index=True)
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
    course = models.ForeignKey(Course, null=True, on_delete=models.CASCADE)

    class Meta:
        ordering = ('start_date', )

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        """Overridden save method"""
        if not self.edx_course_key:
            self.edx_course_key = None
        super(CourseRun, self).save(*args, **kwargs)

    @property
    def is_current(self):
        """Checks if the course is running now"""
        if not self.start_date:
            return False
        now = now_in_utc()
        if not self.end_date:
            return self.start_date <= now
        return self.start_date <= now <= self.end_date

    @property
    def is_past(self):
        """Checks if the course run in the past"""
        if not self.end_date:
            return False
        return self.end_date < now_in_utc()

    @property
    def is_future(self):
        """Checks if the course will run in the future"""
        if not self.start_date:
            return False
        return self.start_date > now_in_utc()

    @property
    def is_promised(self):
        """
        Checks if the course has fuzzy start date

        Returns:
            bool: if the course has only fuzzy start date
        """
        if not self.start_date:
            return self.fuzzy_start_date is not None
        return False

    @property
    def is_future_enrollment_open(self):
        """
        Checks if the course will run in the future and
        enrollment is currently open
        """
        if self.is_future:
            if self.enrollment_start:
                now = now_in_utc()
                if self.enrollment_end:
                    return self.enrollment_start <= now <= self.enrollment_end
                else:
                    return self.enrollment_start <= now
        return False

    @property
    def is_upgradable(self):
        """
        Checks if the course can be upgraded
        A null value means that the upgrade window is always open
        """
        return (self.upgrade_deadline is None or
                (self.upgrade_deadline > now_in_utc()))

    @property
    def is_not_beyond_enrollment(self):
        """
        Checks if the course is not beyond its enrollment period
        """
        now = now_in_utc()
        return (
            (self.enrollment_end is None and (self.end_date is None or self.end_date > now)) or
            self.enrollment_end > now
        )

    @property
    def is_unexpired(self):
        """
        Checks if the course is not expired
        """
        return not self.is_past and self.is_upgradable and self.is_not_beyond_enrollment

    @property
    def can_freeze_grades(self):
        """
        Checks if the final grades can be frozen.
        """
        if self.freeze_grade_date is None:
            raise ImproperlyConfigured('Missing freeze_grade_date')
        return now_in_utc() > self.freeze_grade_date

    @property
    def has_frozen_grades(self):
        """
        Checks if the grades for the course have been frozen
        """
        try:
            freeze_status = self.courserungradingstatus
        except self._meta.model.courserungradingstatus.RelatedObjectDoesNotExist:
            return False
        return freeze_status.status == FinalGradeStatus.COMPLETE

    @property
    def has_future_exam(self):
        """
        Check if the course run has any future exam runs
        """
        return self.course.exam_runs.filter(date_last_eligible__gt=now_in_utc().date()).exists()

    @classmethod
    def get_freezable(cls):
        """
        Returns a queryset of all the runs that can freeze final grade according to the freeze date.
        """
        course_runs = cls.objects.exclude(
            freeze_grade_date=None
        ).exclude(
            courserungradingstatus__status=FinalGradeStatus.COMPLETE
        ).filter(freeze_grade_date__lt=now_in_utc())

        return course_runs


class ElectivesSet(models.Model):
    """
    This represents an electives requirement for a program, with choice of courses and
    required number of courses to be passed.
    """
    program = models.ForeignKey(Program, related_name="electives_set", on_delete=models.CASCADE)
    required_number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255)

    def __str__(self):
        return 'An electives set "{title}" for program "{program_title}"'.format(
            title=self.title,
            program_title=self.program.title
        )


class ElectiveCourse(models.Model):
    """
    Links to a course to an ElectivesSet
    """
    course = models.OneToOneField(Course, on_delete=models.CASCADE)
    electives_set = models.ForeignKey(ElectivesSet, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('course', 'electives_set',)

    def __str__(self):
        return 'Elective course "{course_title}" in electives set "{electives_set}"'.format(
            course_title=self.course.title,
            electives_set=self.electives_set.title
        )
