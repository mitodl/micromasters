"""
Tests for financial aid api
"""
import json

from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import ProgramFactory
from dashboard.models import ProgramEnrollment
from financialaid.api import (
    determine_tier_program,
    determine_auto_approval
)
from financialaid.constants import COUNTRY_INCOME_THRESHOLDS
from financialaid.factories import (
    TierProgramFactory,
    FinancialAidFactory
)
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import Staff, Instructor
from search.base import ESTestCase


class FinancialAidBaseTestCase(ESTestCase):
    """
    Base test case for financial aid test setup
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create()
            cls.profile2 = ProfileFactory.create()
            cls.staff_user_profile = ProfileFactory.create()
            cls.staff_user_profile2 = ProfileFactory.create()
            cls.instructor_user_profile = ProfileFactory.create()
        cls.program = ProgramFactory.create(
            financial_aid_availability=True,
            live=True
        )
        cls.tier_programs = {
            "0k": TierProgramFactory.create(program=cls.program, income_threshold=0, current=True),
            "15k": TierProgramFactory.create(program=cls.program, income_threshold=15000, current=True),
            "50k": TierProgramFactory.create(program=cls.program, income_threshold=50000, current=True),
            "100k": TierProgramFactory.create(
                program=cls.program,
                income_threshold=100000,
                current=True,
                discount_amount=0
            ),
            "150k_not_current": TierProgramFactory.create(program=cls.program, income_threshold=150000, current=False)
        }
        cls.program_enrollment = ProgramEnrollment.objects.create(
            user=cls.profile.user,
            program=cls.program
        )
        # Role for self.staff_user
        Role.objects.create(
            user=cls.staff_user_profile.user,
            program=cls.program,
            role=Staff.ROLE_ID,
        )
        # Role for self.staff_user_profile2.user
        cls.program2 = ProgramFactory.create(
            financial_aid_availability=True,
            live=True
        )
        Role.objects.create(
            user=cls.staff_user_profile2.user,
            program=cls.program2,
            role=Staff.ROLE_ID
        )
        # Role for self.instructor
        Role.objects.create(
            user=cls.instructor_user_profile.user,
            program=cls.program,
            role=Instructor.ROLE_ID
        )

    @staticmethod
    def assert_http_status(method, url, status, data=None, content_type="application/json", **kwargs):
        """
        Helper method for asserting an HTTP status. Returns the response for further tests if needed.
        Args:
            method (method): which http method to use (e.g. self.client.put)
            url (str): url for request
            status (int): http status code
            data (dict): data for request
            content_type (str): content_type for request
            **kwargs: any additional kwargs to pass into method
        Returns:
            rest_framework.response.Response
        """
        if data is not None:
            kwargs["data"] = json.dumps(data)
        resp = method(url, content_type=content_type, **kwargs)
        assert resp.status_code == status
        return resp


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
