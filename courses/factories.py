"""Factories for making test data"""
from random import randint

import faker
import pytz
import factory
from factory import fuzzy
from factory.django import DjangoModelFactory

from courses.models import Program, Course, CourseRun
from ecommerce.models import CoursePrice

FAKE = faker.Factory.create()


class ProgramFactory(DjangoModelFactory):
    """Factory for Programs"""
    title = factory.LazyAttribute(lambda x: FAKE.company())
    description = factory.LazyAttribute(lambda x: FAKE.bs())
    live = True
    financial_aid_availability = False

    course = factory.RelatedFactory('courses.factories.CourseFactory', "program")

    @factory.post_generation
    def tiers(self, create, extracted, **kwargs):  # pylint: disable=unused-argument
        if not extracted:
            return
        if self.financial_aid_availability:
            from financialaid.factories import TierProgramFactory
            for discount, threshold in [(0, 1000), (50, 0)]:
                TierProgramFactory.create(
                    program=self,
                    current=True,
                    discount_amount=discount,
                    income_threshold=threshold,
                )

    class Meta:  # pylint: disable=missing-docstring
        model = Program


class CourseFactory(DjangoModelFactory):
    """Factory for Courses"""
    title = fuzzy.FuzzyText(prefix="Course ")
    position_in_program = factory.Sequence(lambda n: n)
    description = factory.LazyAttribute(lambda x: FAKE.bs())
    prerequisites = fuzzy.FuzzyText(prefix="Course requires ")

    program = factory.SubFactory(ProgramFactory)
    course_run = factory.RelatedFactory(
        'courses.factories.CourseRunFactory',
        "course"
    )

    class Meta:  # pylint: disable=missing-docstring
        model = Course

    @classmethod
    def _setup_next_sequence(cls):
        last = Course.objects.last()
        if last is not None:
            return last.position_in_program + 1
        return 0


class CourseRunFactory(DjangoModelFactory):
    """Factory for CourseRuns"""
    title = factory.LazyAttribute(
        lambda x: "CourseRun " + FAKE.sentence()
    )
    # Try to make sure we escape this correctly
    edx_course_key = factory.LazyAttribute(
        lambda x: "course:/v{}/{}".format(randint(1, 100), FAKE.slug())
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
        lambda x: "Starting {}".format(FAKE.sentence())
    )
    fuzzy_enrollment_start_date = factory.LazyAttribute(
        lambda x: "Enrollment starting {}".format(FAKE.sentence())
    )
    enrollment_url = factory.LazyAttribute(
        lambda x: FAKE.url()
    )
    prerequisites = factory.LazyAttribute(
        lambda x: FAKE.paragraph()
    )

    course = factory.SubFactory(CourseFactory)
    course_price = factory.RelatedFactory(
        'ecommerce.factories.CoursePriceFactory',
        "course_run",
    )

    class Meta:  # pylint: disable=missing-docstring
        model = CourseRun
