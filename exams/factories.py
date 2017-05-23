"""
Factories for exams
"""
from datetime import timedelta

import faker
import pytz
import factory
from factory import SubFactory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from courses.factories import CourseFactory
from exams.models import (
    ExamAuthorization,
    ExamProfile,
    ExamRun,
)
from micromasters.factories import UserFactory
from micromasters.utils import as_datetime
from profiles.factories import ProfileFactory

FAKE = faker.Factory.create()


class ExamProfileFactory(DjangoModelFactory):
    """
    Factory for ExamProfile
    """
    status = FuzzyChoice(
        [value[0] for value in ExamProfile.PROFILE_STATUS_CHOICES]
    )
    profile = SubFactory(ProfileFactory)

    class Meta:
        model = ExamProfile


class ExamRunFactory(DjangoModelFactory):
    """
    Factory for ExamRun
    """
    course = SubFactory(CourseFactory)
    exam_series_code = factory.Faker('lexify', text="????_MicroMasters")
    date_first_schedulable = factory.LazyFunction(
        lambda: FAKE.date_time_this_year(before_now=True, after_now=False, tzinfo=pytz.utc)
    )
    date_last_schedulable = factory.LazyFunction(
        lambda: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc)
    )
    date_first_eligible = factory.LazyFunction(
        lambda: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc).date()
    )
    date_last_eligible = factory.LazyAttribute(
        lambda exam_run: exam_run.date_first_eligible + timedelta(days=20)
    )
    date_grades_available = factory.LazyAttribute(
        # Convert date to datetime
        lambda exam_run: as_datetime(exam_run.date_last_eligible)
    )
    authorized = False

    class Meta:
        model = ExamRun

    class Params:
        eligibility_past = factory.Trait(
            date_first_eligible=factory.LazyAttribute(
                lambda exam_run: exam_run.date_last_eligible - timedelta(days=20)
            ),
            date_last_eligible=factory.LazyFunction(
                lambda: FAKE.date_time_this_year(before_now=True, after_now=False, tzinfo=pytz.utc).date()
            )
        )
        eligibility_future = factory.Trait(
            date_first_eligible=factory.LazyFunction(
                lambda: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc).date()
            ),
            date_last_eligible=factory.LazyAttribute(
                lambda exam_run: exam_run.date_first_eligible + timedelta(days=20)
            )
        )
        scheduling_past = factory.Trait(
            date_first_schedulable=factory.LazyAttribute(
                lambda exam_run: exam_run.date_last_schedulable - timedelta(days=10)
            ),
            date_last_schedulable=factory.LazyFunction(
                lambda: FAKE.date_time_this_year(before_now=True, after_now=False, tzinfo=pytz.utc)
            )
        )
        scheduling_future = factory.Trait(
            date_first_schedulable=factory.LazyFunction(
                lambda: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc)
            ),
            date_last_schedulable=factory.LazyAttribute(
                lambda exam_run: exam_run.date_first_schedulable + timedelta(days=10)
            )
        )


class ExamAuthorizationFactory(DjangoModelFactory):
    """
    Factory for ExamAuthorization
    """
    user = SubFactory(UserFactory)
    course = SubFactory(CourseFactory)

    operation = FuzzyChoice(
        [value[0] for value in ExamAuthorization.OPERATION_CHOICES]
    )
    status = FuzzyChoice(
        [value[0] for value in ExamAuthorization.STATUS_CHOICES]
    )

    exam_run = SubFactory(ExamRunFactory)

    class Meta:
        model = ExamAuthorization
