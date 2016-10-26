"""
Factories for financialaid tests
"""
import datetime
from django.db.models.signals import post_save
from factory import SubFactory
from factory.django import DjangoModelFactory, mute_signals
from factory.fuzzy import (
    FuzzyAttribute,
    FuzzyChoice,
    FuzzyDate,
    FuzzyDateTime,
    FuzzyFloat,
    FuzzyInteger,
    FuzzyText
)
import faker
from pytz import UTC

from courses.factories import ProgramFactory
from financialaid.constants import FinancialAidStatus
from financialaid.models import (
    CountryIncomeThreshold,
    FinancialAid,
    Tier,
    TierProgram
)
from profiles.factories import ProfileFactory

FAKE = faker.Factory.create()


class TierFactory(DjangoModelFactory):
    """
    Factory for Tier
    """
    name = FuzzyText()
    description = FuzzyText()

    class Meta:  # pylint: disable=missing-docstring
        model = Tier


class TierProgramFactory(DjangoModelFactory):
    """
    Factory for TierProgram
    """
    program = SubFactory(ProgramFactory)
    tier = SubFactory(TierFactory)
    discount_amount = FuzzyInteger(low=1, high=12345)
    current = FuzzyAttribute(FAKE.boolean)
    income_threshold = FuzzyInteger(low=1, high=10000)

    class Meta:  # pylint: disable=missing-docstring
        model = TierProgram


class FinancialAidFactory(DjangoModelFactory):
    """
    Factory for FinancialAid
    """
    # user = SubFactory(UserFactory) is implied, since it is created in the cls.create() method
    tier_program = SubFactory(TierProgramFactory)
    status = FuzzyChoice(FinancialAidStatus.ALL_STATUSES)
    income_usd = FuzzyFloat(low=0, high=12345)
    original_income = FuzzyFloat(low=0, high=12345)
    original_currency = FuzzyText(length=3)
    country_of_income = FuzzyText(length=2)
    date_exchange_rate = FuzzyDateTime(datetime.datetime(2000, 1, 1, tzinfo=UTC))
    date_documents_sent = FuzzyDate(datetime.date(2000, 1, 1))

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
        model = FinancialAid


class CountryIncomeThresholdFactory(DjangoModelFactory):
    """
    Factory for CountryIncomeThreshold
    """
    country_code = FuzzyText(length=2)
    income_threshold = FuzzyInteger(low=0, high=123456)

    class Meta:  # pylint: disable=missing-docstring
        model = CountryIncomeThreshold
