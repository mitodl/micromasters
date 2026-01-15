"""
Factories for financialaid tests
"""
import datetime

from django.db.models.signals import post_save
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory, mute_signals
from factory.fuzzy import (FuzzyChoice, FuzzyDate, FuzzyDateTime, FuzzyFloat,
                           FuzzyInteger, FuzzyText)
from pytz import UTC

from courses.factories import ProgramFactory
from financialaid.constants import FinancialAidStatus
from financialaid.models import (CountryIncomeThreshold, FinancialAid, Tier,
                                 TierProgram)
from profiles.factories import ProfileFactory


class TierFactory(DjangoModelFactory):
    """
    Factory for Tier
    """
    name = FuzzyText()
    description = FuzzyText()

    class Meta:
        model = Tier


class TierProgramFactory(DjangoModelFactory):
    """
    Factory for TierProgram
    """
    program = SubFactory(ProgramFactory)
    tier = SubFactory(TierFactory)
    discount_amount = FuzzyInteger(low=50, high=200)
    current = Faker('boolean')
    income_threshold = FuzzyInteger(low=50, high=200)

    class Meta:
        model = TierProgram

    @classmethod
    def create_properly_configured_batch(cls, num_to_create, tier_size=5000, discount_threshold_pct=80, **kwargs):
        """
        Creates a batch of TierPrograms that obey a few constraints:
        (1) Discount amounts decrease as income increases
        (2) Discount amounts will not exceed the program price
        (3) One TierProgram in the batch will have a 0 discount amount, and one will have a 0 income threshold
        """
        if num_to_create < 1:
            raise ValueError('Number of tiers to create must be greater than 0')

        program = kwargs.pop('program', None)
        if not program:
            program = ProgramFactory.create()
        # Set a value to increment the discount amount for each successive TierProgram. This value
        # is set relative to the program price and the number of tiers being created so we don't end
        # up with discount amounts that are greater than the price.
        discount_increment = int(
            (float(program.price) * (discount_threshold_pct / 100)) /
            num_to_create - 1 or 1
        )
        tier_programs = []
        # Create TierPrograms in such a way that higher incomes result in lower discount amounts,
        # and guarantee that there will be a TierProgram that has discount_amount=0, and another that
        # has income_threshold=0
        for i in range(num_to_create):
            discount_multiplier = num_to_create - (i + 1)
            discount_amount = discount_increment * discount_multiplier
            income_threshold = tier_size * i
            tier_programs.append(
                cls.create(
                    program=program,
                    discount_amount=discount_amount,
                    income_threshold=income_threshold,
                    current=True
                )
            )
        return tier_programs


class FinancialAidFactory(DjangoModelFactory):
    """
    Factory for FinancialAid
    """
    # user = SubFactory(UserFactory) is implied, since it is created in the cls.create() method
    tier_program = SubFactory(TierProgramFactory)
    status = FuzzyChoice(
        # the reset status is a special case, so removing it from the options
        [status for status in FinancialAidStatus.ALL_STATUSES if status != FinancialAidStatus.RESET]
    )
    income_usd = FuzzyFloat(low=0, high=12345)
    original_income = FuzzyFloat(low=0, high=12345)
    original_currency = Faker('currency_code')
    country_of_income = Faker('country_code')
    country_of_residence = Faker('country_code')
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

    class Meta:
        model = FinancialAid


class CountryIncomeThresholdFactory(DjangoModelFactory):
    """
    Factory for CountryIncomeThreshold
    """
    country_code = FuzzyText(length=2)
    income_threshold = FuzzyInteger(low=0, high=123456)

    class Meta:
        model = CountryIncomeThreshold
