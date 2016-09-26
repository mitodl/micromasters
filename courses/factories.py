"""Factories for making test data"""
from datetime import datetime
import pytz

import factory
from factory import fuzzy
from factory.django import DjangoModelFactory
import faker

from .models import Program, Course, CourseRun


FAKE = faker.Factory.create()


class ProgramFactory(DjangoModelFactory):
    """Factory for Programs"""
    title = fuzzy.FuzzyText(prefix="Program ")
    live = fuzzy.FuzzyAttribute(FAKE.boolean)
    description = fuzzy.FuzzyText()

    class Meta:  # pylint: disable=missing-docstring
        model = Program


class CourseFactory(DjangoModelFactory):
    """Factory for Courses"""
    title = fuzzy.FuzzyText(prefix="Course ")
    program = factory.SubFactory(ProgramFactory)
    position_in_program = factory.Sequence(lambda n: n)

    description = fuzzy.FuzzyText()
    prerequisites = fuzzy.FuzzyText(prefix="Course requires ")

    class Meta:  # pylint: disable=missing-docstring
        model = Course

    @classmethod
    def _setup_next_sequence(cls):
        last = Course.objects.order_by('position_in_program').last()
        if last is not None:
            return last.position_in_program + 1
        return 0


class CourseRunFactory(DjangoModelFactory):
    """Factory for CourseRuns"""
    title = fuzzy.FuzzyText(prefix="CourseRun ")
    course = factory.SubFactory(CourseFactory)
    # Try to make sure we escape this correctly
    edx_course_key = fuzzy.FuzzyText(prefix="course:/()+&/")
    enrollment_start = fuzzy.FuzzyDateTime(datetime(1980, 1, 1, tzinfo=pytz.utc))
    start_date = fuzzy.FuzzyDateTime(datetime(1980, 1, 1, tzinfo=pytz.utc))
    enrollment_end = fuzzy.FuzzyDateTime(datetime(1980, 1, 1, tzinfo=pytz.utc))
    end_date = fuzzy.FuzzyDateTime(datetime(1980, 1, 1, tzinfo=pytz.utc))
    fuzzy_start_date = fuzzy.FuzzyText(prefix="Starting ")
    fuzzy_enrollment_start_date = fuzzy.FuzzyText(prefix="Enrollment starting ")
    enrollment_url = fuzzy.FuzzyText(prefix="http://")
    prerequisites = fuzzy.FuzzyText(prefix="CourseRun requires ")

    class Meta:  # pylint: disable=missing-docstring
        model = CourseRun

    @classmethod
    def create(cls, **kwargs):
        # If 'program' is provided, build a Course from it first
        if 'program' in kwargs:
            kwargs['course'] = CourseFactory.create(program=kwargs.pop('program'))
        # Create the CourseRun as normal
        attrs = cls.attributes(create=True, extra=kwargs)
        return cls._generate(True, attrs)
