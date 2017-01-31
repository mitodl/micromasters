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
)
from micromasters.factories import UserFactory
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
    date_first_eligible = factory.LazyFunction(
        lambda: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc).date()
    )
    date_last_eligible = factory.LazyAttribute(
        lambda exam_auth: exam_auth.date_first_eligible + timedelta(days=10)
    )

    class Meta:
        model = ExamAuthorization
