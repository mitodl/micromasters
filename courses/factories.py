"""Factories for making test data"""
from random import randint

import faker
import pytz
import factory
from factory import fuzzy
from factory.django import DjangoModelFactory

from .models import Program, Course, CourseRun

FAKE = faker.Factory.create()


class ProgramFactory(DjangoModelFactory):
    """Factory for Programs"""
    title = fuzzy.FuzzyText(prefix="Program ")
    live = factory.Faker('boolean')
    description = fuzzy.FuzzyText()
    exam_series_code = factory.Faker('lexify', text="????_MicroMasters")

    class Meta:  # pylint: disable=missing-docstring
        model = Program

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        full_create = kwargs.pop('full', False)
        program = model_class(*args, **kwargs)
        program.save()
        if full_create:
            course = CourseFactory.create(program=program)
            course_run = CourseRunFactory.create(course=course)
            from ecommerce.factories import CoursePriceFactory
            course_price = CoursePriceFactory.create(course_run=course_run, is_valid=True)
            if program.financial_aid_availability:
                from financialaid.factories import TierProgramFactory
                TierProgramFactory.create(
                    program=program,
                    current=True,
                    discount_amount=0,
                    income_threshold=1000
                )
                TierProgramFactory.create(
                    program=program,
                    current=True,
                    discount_amount=int(course_price.price / 10),
                    income_threshold=0
                )
        return program


class CourseFactory(DjangoModelFactory):
    """Factory for Courses"""
    title = fuzzy.FuzzyText(prefix="Course ")
    program = factory.SubFactory(ProgramFactory)
    position_in_program = factory.Sequence(lambda n: n)

    description = fuzzy.FuzzyText()
    prerequisites = fuzzy.FuzzyText(prefix="Course requires ")
    exam_module = factory.Faker('numerify', text="##.##x")

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
    course = factory.SubFactory(CourseFactory)
    # Try to make sure we escape this correctly
    edx_course_key = factory.LazyAttribute(
        lambda x: "course:/v{}/{}".format(randint(1, 100), FAKE.slug())
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
    enrollment_url = factory.Faker('url')
    prerequisites = factory.Faker('paragraph')

    class Meta:  # pylint: disable=missing-docstring
        model = CourseRun
