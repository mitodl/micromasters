"""
Factories for exam models
"""

import datetime
import faker
import pytz

from django.db.models.signals import post_save
from factory.declarations import LazyAttribute
from factory.django import DjangoModelFactory, mute_signals
from factory.fuzzy import (
    FuzzyDateTime,
    FuzzyText,
)

from exams.models import ProctoredProfile
from profiles.factories import ProfileFactory

FAKE = faker.Factory.create()


class ProctoredProfileFactory(DjangoModelFactory):
    """
    Factory for ProctoredProfile
    """
    # user = SubFactory(UserFactory) is implied, since it is created in the cls.create() method

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

    @classmethod
    def create(cls, **kwargs):
        """
        Overrides the default .create() method so that if no user is specified in kwargs, this factory
        will create a user with an associated profile without relying on signals.
        """
        if "user" not in kwargs:
            with mute_signals(post_save):
                profile = ProfileFactory.create()
            kwargs["user"] = profile.user
        return super().create(**kwargs)

    class Meta:  # pylint: disable=missing-docstring
        model = ProctoredProfile
