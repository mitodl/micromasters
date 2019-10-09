"""Factories for making test data"""
import random

import faker
import pytz
import factory
from factory import fuzzy
from factory.django import DjangoModelFactory

from .models import Program, Course, CourseRun, Topic

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
            if self.financial_aid_availability:
                from financialaid.factories import TierProgramFactory
                TierProgramFactory.create_properly_configured_batch(2, program=self)
            return self
        return None


class CourseFactory(DjangoModelFactory):
    """Factory for Courses"""
    title = fuzzy.FuzzyText(prefix="Course ")
    program = factory.SubFactory(ProgramFactory)
    position_in_program = factory.Sequence(lambda n: n)

    edx_key = factory.Sequence(lambda number: "v{}".format(number))  # pylint: disable=unnecessary-lambda

    description = fuzzy.FuzzyText()
    prerequisites = fuzzy.FuzzyText(prefix="Course requires ")

    class Meta:
        model = Course


class CourseRunFactory(DjangoModelFactory):
    """Factory for CourseRuns"""
    title = factory.LazyAttribute(
        lambda x: "CourseRun " + FAKE.sentence()
    )
    course = factory.SubFactory(CourseFactory)
    # Try to make sure we escape this correctly
    edx_course_key = factory.Sequence(
        lambda number: "course:/v{}/{}".format(number, FAKE.slug())
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
        lambda x: "Starting {}".format(FAKE.sentence())
    )
    fuzzy_enrollment_start_date = factory.LazyAttribute(
        lambda x: "Enrollment starting {}".format(FAKE.sentence())
    )
    upgrade_deadline = factory.Faker(
        'date_time_this_year', before_now=False, after_now=True, tzinfo=pytz.utc
    )
    enrollment_url = factory.Faker('url')
    prerequisites = factory.Faker('paragraph')

    class Meta:
        model = CourseRun
