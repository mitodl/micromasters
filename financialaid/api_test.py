"""
Tests for financialaid api
"""
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import ProgramFactory
from dashboard.models import ProgramEnrollment
from financialaid.api import determine_tier_program, determine_auto_approval
from financialaid.constants import COUNTRY_INCOME_THRESHOLDS
from financialaid.factories import TierProgramFactory, FinancialAidFactory
from profiles.factories import ProfileFactory
from search.base import ESTestCase


class FinancialAidBaseTestCase(ESTestCase):
    """
    Base test case for financialaid test setup
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create()
        cls.program = ProgramFactory.create(
            financial_aid_availability=True,
            live=True
        )
        cls.tier_programs = {
            "0k": TierProgramFactory.create(program=cls.program, income_threshold=0, current=True),
            "15k": TierProgramFactory.create(program=cls.program, income_threshold=15000, current=True),
            "50k": TierProgramFactory.create(program=cls.program, income_threshold=50000, current=True),
            "100k": TierProgramFactory.create(program=cls.program, income_threshold=100000, current=True),
            "150k_not_current": TierProgramFactory.create(program=cls.program, income_threshold=150000, current=False)
        }
        cls.program_enrollment = ProgramEnrollment.objects.create(
            user=cls.profile.user,
            program=cls.program
        )


class FinancialAidAPITests(FinancialAidBaseTestCase):
    """
    Tests for financialaid api backend
    """
    def test_determine_tier_program(self):
        """
        Tests determine_tier_program()
        """
        assert determine_tier_program(self.program, 0) == self.tier_programs["0k"]
        assert determine_tier_program(self.program, 1000) == self.tier_programs["0k"]
        assert determine_tier_program(self.program, 15000) == self.tier_programs["15k"]
        assert determine_tier_program(self.program, 23500) == self.tier_programs["15k"]
        assert determine_tier_program(self.program, 50000) == self.tier_programs["50k"]
        assert determine_tier_program(self.program, 72800) == self.tier_programs["50k"]
        assert determine_tier_program(self.program, 100000) == self.tier_programs["100k"]
        assert determine_tier_program(self.program, 34938234) == self.tier_programs["100k"]
        assert determine_tier_program(self.program, 34938234) != self.tier_programs["150k_not_current"]

    def test_determine_auto_approval(self):  # pylint: disable=no-self-use
        """
        Tests determine_auto_approval()
        """
        # Assumes US threshold is 100000
        assert COUNTRY_INCOME_THRESHOLDS["US"] == 100000
        financial_aid = FinancialAidFactory.create(
            income_usd=150000,
            country_of_income="US"
        )
        assert determine_auto_approval(financial_aid) is True
        financial_aid = FinancialAidFactory.create(
            income_usd=1000,
            country_of_income="US"
        )
        assert not determine_auto_approval(financial_aid)
        financial_aid = FinancialAidFactory.create(
            income_usd=0,
            country_of_income="US"
        )
        assert not determine_auto_approval(financial_aid)

        # Assumes MX threshold is 50000
        assert COUNTRY_INCOME_THRESHOLDS["MX"] == 50000
        financial_aid = FinancialAidFactory.create(
            income_usd=55000,
            country_of_income="MX"
        )
        assert determine_auto_approval(financial_aid) is True
        financial_aid = FinancialAidFactory.create(
            income_usd=45000,
            country_of_income="MX"
        )
        assert not determine_auto_approval(financial_aid)

        # Assumes IN threshold is 15000
        assert COUNTRY_INCOME_THRESHOLDS["IN"] == 15000
        financial_aid = FinancialAidFactory.create(
            income_usd=20000,
            country_of_income="IN"
        )
        assert determine_auto_approval(financial_aid) is True
        financial_aid = FinancialAidFactory.create(
            income_usd=1000,
            country_of_income="IN"
        )
        assert not determine_auto_approval(financial_aid)

        # Assumes KP threshold is 0
        assert COUNTRY_INCOME_THRESHOLDS["KP"] == 0
        financial_aid = FinancialAidFactory.create(
            income_usd=3000,
            country_of_income="KP"
        )
        assert determine_auto_approval(financial_aid) is True
        financial_aid = FinancialAidFactory.create(
            income_usd=0,
            country_of_income="KP"
        )
        assert determine_auto_approval(financial_aid) is True
