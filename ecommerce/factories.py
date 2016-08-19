"""
Factories for ecommerce models
"""
from factory import SubFactory
from factory.django import DjangoModelFactory
from factory.fuzzy import (
    FuzzyAttribute,
    FuzzyDecimal,
)
import faker

from courses.factories import CourseRunFactory
from ecommerce.models import CoursePrice


FAKE = faker.Factory.create()


class CoursePriceFactory(DjangoModelFactory):
    """Factory for CoursePrice"""
    course_run = SubFactory(CourseRunFactory)
    is_valid = FuzzyAttribute(FAKE.boolean)
    price = FuzzyDecimal(low=0, high=12345)

    class Meta:  # pylint: disable=missing-docstring,no-init,too-few-public-methods,old-style-class
        model = CoursePrice
