"""Factories for making test data"""
import random

import factory
import faker
import pytz
from factory import fuzzy
from factory.django import DjangoModelFactory

from .models import Course, CourseRun, Program, Topic

FAKE = faker.Factory.create()


class TopicFactory(DjangoModelFactory):
    """Factory for Topics"""
    name = fuzzy.FuzzyText()

    class Meta:
        model = Topic


def _post_gen_topics(obj, create, extracted):
    """PostGeneration function for topics"""
    if not create:
        return

    if extracted is None:
        extracted = TopicFactory.create_batch(random.randint(0, 5))

    obj.topics.set(extracted)


class ProgramFactory(DjangoModelFactory):
    """Factory for Programs"""
    title = fuzzy.FuzzyText(prefix="Program ")
    live = factory.Faker('boolean')
    description = fuzzy.FuzzyText()
    price = fuzzy.FuzzyDecimal(low=500, high=2000)
    num_required_courses = 1
    topics = factory.PostGeneration(_post_gen_topics)

    class Meta:
        model = Program


class FullProgramFactory(ProgramFactory):
    """Factory for Programs that also creates some related objects that we care about"""
    @factory.post_generation
    def post_gen(self, created, *args, **kwargs):  # pylint: disable=unused-argument
        """Post-object generation hook"""
        if created:
            CourseRunFactory.create(course__program=self)
            # Financial aid functionality removed - TierProgram no longer created
            return self
        return None


class CourseFactory(DjangoModelFactory):
    """Factory for Courses"""
    title = fuzzy.FuzzyText(prefix="Course ")
    program = factory.SubFactory(ProgramFactory)
    position_in_program = factory.Sequence(lambda n: n)

    edx_key = factory.Sequence(lambda number: f"v{number}")  # pylint: disable=unnecessary-lambda

    description = fuzzy.FuzzyText()
    prerequisites = fuzzy.FuzzyText(prefix="Course requires ")

    class Meta:
        model = Course


class CourseRunFactory(DjangoModelFactory):
    """Factory for CourseRuns"""
    title = factory.LazyAttribute(
        lambda x: f"CourseRun {FAKE.sentence()}"
    )
    course = factory.SubFactory(CourseFactory)
    # Try to make sure we escape this correctly
    edx_course_key = factory.Sequence(
        lambda number: f"course:/v{number}/{FAKE.slug()}"
    )
    enrollment_start = factory.Faker(
        'date_time_this_month', before_now=True, after_now=False, tzinfo=pytz.utc
    )
    start_date = factory.Faker(
        'date_time_this_month', before_now=True, after_now=False, tzinfo=pytz.utc
    )
    enrollment_end = factory.Faker(
        'date_time_this_month', before_now=False, after_now=True, tzinfo=pytz.utc
    )
    end_date = factory.Faker(
        'date_time_this_year', before_now=False, after_now=True, tzinfo=pytz.utc
    )
    freeze_grade_date = factory.Faker(
        'date_time_this_year', before_now=False, after_now=True, tzinfo=pytz.utc
    )
    fuzzy_start_date = factory.LazyAttribute(
        lambda x: f"Starting {FAKE.sentence()}"
    )
    fuzzy_enrollment_start_date = factory.LazyAttribute(
        lambda x: f"Enrollment starting {FAKE.sentence()}"
    )
    upgrade_deadline = factory.Faker(
        'date_time_this_year', before_now=False, after_now=True, tzinfo=pytz.utc
    )
    enrollment_url = factory.Faker('url')
    prerequisites = factory.Faker('paragraph')

    class Meta:
        model = CourseRun

    class Params:
        future_run = factory.Trait(
            enrollment_start = factory.Faker(
                'date_time_between',
                start_date="+1d",
                end_date="+30d",
                tzinfo=pytz.utc
            )
        )


def create_program(past=False):
    """
    Helper function to create a program with course and course run for tests.

    Args:
        past (bool): If True, creates course runs with past dates

    Returns:
        tuple: (program, None) - second element is None for backward compatibility
    """
    from datetime import timedelta
    from micromasters.utils import now_in_utc

    program = FullProgramFactory.create()

    if past:
        now = now_in_utc()
        course_run = program.course_set.first().courserun_set.first()
        course_run.start_date = now - timedelta(days=365)
        course_run.end_date = now - timedelta(days=30)
        course_run.enrollment_start = now - timedelta(days=400)
        course_run.enrollment_end = now - timedelta(days=350)
        course_run.save()

    return program, None
