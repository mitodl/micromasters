"""
Models for course structure
"""
from datetime import datetime

import pytz
from django.db import models
from modelcluster.fields import ParentalKey
from wagtail.wagtailcore.fields import RichTextField
from wagtail.wagtailcore.models import Page, Orderable
from wagtail.wagtailadmin.edit_handlers import (FieldPanel, MultiFieldPanel,
                                                InlinePanel)
from wagtail.wagtailimages.edit_handlers import ImageChooserPanel


class Program(Page):
    """
    A degree someone can pursue, e.g. "Supply Chain Management"
    """
    # title = models.CharField(max_length=255)
    # live = models.BooleanField(default=False)
    description = RichTextField(blank=True, null=True)

    content_panels = Page.content_panels + [
        FieldPanel('description', classname="full"),
        InlinePanel('FAQs', label='Frequently Asked Questions'),
        InlinePanel('Courses', label='Program Courses')
    ]

    def __str__(self):
        return self.title


class Course(Orderable):
    """
    A logical representation of a course, such as "Supply Chain Management
    101". This won't have associated dates or any specific information about a
    given course instance (aka course run), but rather only the things that are
    general across multiple course runs.
    """
    program = ParentalKey(Program, related_name='Courses')
    # program = models.ForeignKey(Program)
    # position_in_program = models.PositiveSmallIntegerField(null=True)

    # These fields will likely make their way into the CMS at some point.
    title = models.CharField(max_length=255, default='')
    thumbnail = models.ImageField(null=True, blank=True)
    description = RichTextField(blank=True, null=True)
    prerequisites = models.TextField(blank=True, null=True)

    content_panels = Page.content_panels + [
        MultiFieldPanel(
            [
                FieldPanel('title'),
                FieldPanel('description'),
                FieldPanel('prerequisites'),
                ImageChooserPanel('thumbnail'),
            ]
        )
    ]

    def __str__(self):
        return self.title

    class Meta:
        unique_together = ('program', 'sort_order',)

    def get_next_run(self):
        """
        Gets the next run associated with this course.
        Note that it could be current as long as the enrollment window
        has not closed.
        """
        now = datetime.now(pytz.utc)
        next_run_set = self.courserun_set.filter(
            # there is only the start date
            (models.Q(enrollment_end=None) &
             models.Q(end_date=None) & models.Q(start_date__lte=now)) |
            # there is no enrollment date but the course has not ended yet
            (models.Q(enrollment_end=None) & models.Q(end_date__gte=now)) |
            # the enrollment end date is simply greater than now
            models.Q(enrollment_end__gte=now)
        )
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
