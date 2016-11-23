"""
Factories for exam models
"""

import datetime
import faker
import pytz

from factory import SubFactory
from factory.declarations import LazyAttribute
from factory.django import DjangoModelFactory
from factory.fuzzy import (
    FuzzyDateTime,
    FuzzyText,
)

from exams.models import ProctoredProfile
from micromasters.factories import UserFactory

FAKE = faker.Factory.create()


class ProctoredProfileFactory(DjangoModelFactory):
    """
    Factory for ProctoredProfile
    """
    user = SubFactory(UserFactory)

    updated_on = FuzzyDateTime(datetime.datetime(2012, 1, 1, tzinfo=pytz.utc))
    synced_on = FuzzyDateTime(datetime.datetime(2012, 1, 1, tzinfo=pytz.utc))

    first_name = LazyAttribute(lambda x: FAKE.first_name())
    last_name = LazyAttribute(lambda x: FAKE.last_name())

    address1 = LazyAttribute(lambda x: '{} {}'.format(FAKE.building_number(), FAKE.street_name()))
    address2 = LazyAttribute(lambda x: FAKE.secondary_address())
    address3 = FuzzyText(length=0)  # intentionally blank

    state_or_territory = LazyAttribute(lambda x: FAKE.state())
    # needs to be a ISO 3 digit country code for Pearson
    country = LazyAttribute(lambda x: FAKE.numerify(text="###"))
    city = LazyAttribute(lambda x: FAKE.city())
    postal_code = LazyAttribute(lambda x: FAKE.postcode())

    phone_number = LazyAttribute(lambda x: FAKE.phone_number())
    phone_country_code = LazyAttribute(lambda x: FAKE.random_digit())

    class Meta:  # pylint: disable=missing-docstring
        model = ProctoredProfile
