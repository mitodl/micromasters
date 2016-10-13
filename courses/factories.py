"""Factories for making test data"""
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
    title = factory.LazyAttribute(
        lambda x: "CourseRun " + FAKE.sentence()
    )
    course = factory.SubFactory(CourseFactory)
    # Try to make sure we escape this correctly
    edx_course_key = factory.LazyAttribute(
        lambda x: "course:/()+&/" + FAKE.sentence()
    )
    enrollment_start = factory.LazyAttribute(
        lambda x: FAKE.date_time_this_month(before_now=True, after_now=False, tzinfo=pytz.utc)
    )
    start_date = factory.LazyAttribute(
        lambda x: FAKE.date_time_this_month(before_now=True, after_now=False, tzinfo=pytz.utc)
    )
    enrollment_end = factory.LazyAttribute(
        lambda x: FAKE.date_time_this_month(before_now=False, after_now=True, tzinfo=pytz.utc)
    )
    end_date = factory.LazyAttribute(
        lambda x: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc)
    )
    fuzzy_start_date = factory.LazyAttribute(
        lambda x: "Starting " + FAKE.sentence()
    )
    fuzzy_enrollment_start_date = factory.LazyAttribute(
        lambda x: "Enrollment starting " + FAKE.sentence()
    )
    enrollment_url = factory.LazyAttribute(
        lambda x: FAKE.url()
    )
    prerequisites = factory.LazyAttribute(
        lambda x: FAKE.paragraph()
    )

    class Meta:  # pylint: disable=missing-docstring
        model = CourseRun
