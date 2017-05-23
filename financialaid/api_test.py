"""
Tests for financial aid api
"""
import json

from datetime import timedelta
import ddt
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from dashboard.models import ProgramEnrollment
from financialaid.api import (
    determine_auto_approval,
    determine_income_usd,
    determine_tier_program,
    get_formatted_course_price,
    get_no_discount_tier_program,
    update_currency_exchange_rate
)
from financialaid.constants import FinancialAidStatus
from financialaid.factories import (
    FinancialAidFactory,
    TierProgramFactory
)
from financialaid.models import (
    CountryIncomeThreshold,
    CurrencyExchangeRate
)
from micromasters.utils import now_in_utc
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import Staff, Instructor
from search.base import MockedESTestCase


def create_program(create_tiers=True, past=False):
    """
    Helper function to create a financial aid program
    Returns:
        courses.models.Program: A new program
    """
    end_date = None
    program = ProgramFactory.create(
        financial_aid_availability=True,
        live=True
    )
    course = CourseFactory.create(program=program)

    if past:
        end_date = now_in_utc() - timedelta(days=100)
    else:
        end_date = now_in_utc() + timedelta(days=100)

    CourseRunFactory.create(
        end_date=end_date,
        enrollment_end=now_in_utc() + timedelta(hours=1),
        course=course
    )
    tier_programs = None
    if create_tiers:
        tier_programs = {
            "0k": TierProgramFactory.create(program=program, income_threshold=0, current=True),
            "25k": TierProgramFactory.create(program=program, income_threshold=25000, current=True),
            "50k": TierProgramFactory.create(program=program, income_threshold=50000, current=True),
            "75k": TierProgramFactory.create(
                program=program,
                income_threshold=75000,
                current=True,
                discount_amount=0
            ),
        }
    return program, tier_programs


def create_enrolled_profile(program, role=None, **profile_kwargs):
    """
    Helper function to create a profile and some related models

    Args:
        program (courses.models.Program):
            A program
        role (str or None):
            A role, or no role if None
    Returns:
        profiles.models.Profile: A new profile
    """
    with mute_signals(post_save):
        profile = ProfileFactory.create(**profile_kwargs)

    ProgramEnrollment.objects.create(
        user=profile.user,
        program=program
    )
    if role is not None:
        Role.objects.create(
            user=profile.user,
            program=program,
            role=role,
        )

    return profile


class FinancialAidBaseTestCase(MockedESTestCase):
    """
    Base test case for financial aid test setup
    """
    @classmethod
    def setUpTestData(cls):
        # replace imported thresholds with fake ones created here
        CountryIncomeThreshold.objects.all().delete()

        cls.program, cls.tier_programs = create_program()
        cls.profile = create_enrolled_profile(cls.program, country="50")
        cls.staff_user_profile = create_enrolled_profile(cls.program, role=Staff.ROLE_ID)
        cls.instructor_user_profile = create_enrolled_profile(cls.program, role=Instructor.ROLE_ID)
        cls.country_income_threshold_0 = CountryIncomeThreshold.objects.create(
            country_code="0",
            income_threshold=0,
        )
        CountryIncomeThreshold.objects.create(
            country_code=cls.profile.country,
            income_threshold=50000,
        )

        # Create a FinancialAid with a reset status to verify that it is ignored
        FinancialAidFactory.create(
            user=cls.profile.user,
            tier_program=cls.tier_programs['75k'],
            status=FinancialAidStatus.RESET,
        )

    @staticmethod
    def make_http_request(method, url, status, data=None, content_type="application/json", **kwargs):
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


@ddt.ddt
class FinancialAidAPITests(FinancialAidBaseTestCase):
    """
    Tests for financialaid api backend
    """
    def setUp(self):
        super().setUp()
        self.program.refresh_from_db()

    @ddt.data(
        [0, "0k"],
        [1000, "0k"],
        [25000, "25k"],
        [27500, "25k"],
        [50000, "50k"],
        [72800, "50k"],
        [75000, "75k"],
        [34938234, "75k"],
    )
    @ddt.unpack
    def test_determine_tier_program(self, income, expected_tier_key):
        """
        Tests determine_tier_program() assigning the correct tiers. This should assign the tier where the tier's
        income threshold is equal to or less than income.
        """
        assert determine_tier_program(self.program, income) == self.tier_programs[expected_tier_key]

    def test_determine_tier_program_not_current(self):
        """
        A current=False tier should be ignored
        """
        not_current = TierProgramFactory.create(program=self.program, income_threshold=75000, current=False)
        assert determine_tier_program(self.program, 34938234) != not_current

    def test_determine_tier_program_improper_setup(self):
        """
        Tests that determine_tier_program() raises ImproperlyConfigured if no $0-discount TierProgram
        has been created and income supplied is too low.
        """
        program = ProgramFactory.create()
        with self.assertRaises(ImproperlyConfigured):
            determine_tier_program(program, 0)

    @ddt.data(
        [0, "0", True],
        [1, "0", True],
        [0, "50", False],
        [49999, "50", False],
        [50000, "50", False],
        [50001, "50", True],
    )
    @ddt.unpack
    def test_determine_auto_approval(self, income_usd, country_code, expected):
        """
        Tests determine_auto_approval() assigning the correct auto-approval status. This should return True
        if income is strictly greater than the threshold (or if the threshold is 0, which is inclusive of 0).
        """
        financial_aid = FinancialAidFactory.create(
            income_usd=income_usd,
            country_of_income=country_code,
        )
        tier_program = determine_tier_program(self.program, income_usd)
        assert determine_auto_approval(financial_aid, tier_program) is expected

    def test_determine_income_usd_from_not_usd(self):
        """
        Tests determine_income_usd() from a non-USD currency
        """
        CurrencyExchangeRate.objects.create(
            currency_code="GHI",
            exchange_rate=1.5
        )
        assert determine_income_usd(3000, "GHI") == 2000

    def test_determine_income_usd_from_usd(self):
        """
        Tests determine_income_usd() from a USD currency
        """
        # Note no CurrencyExchangeRate created here
        assert determine_income_usd(5000, "USD") == 5000

    def test_get_no_discount_tier_program(self):
        """
        Tests get_no_discount_tier_program()
        """
        # 75k tier program is the one with no discount
        assert get_no_discount_tier_program(self.program.id).id == self.tier_programs["75k"].id

    def test_missing_no_discount_tier(self):
        """It should raise an ImproperlyConfigured if there is no $0 discount TierProgram"""
        program, _ = create_program(create_tiers=False)
        with self.assertRaises(ImproperlyConfigured):
            # No tier programs have been created for program
            get_no_discount_tier_program(program.id)


@ddt.ddt
class CoursePriceAPITests(FinancialAidBaseTestCase):
    """
    Tests for course price api backend
    """
    def setUp(self):
        super().setUp()
        self.program.refresh_from_db()

    @ddt.data(
        [FinancialAidStatus.APPROVED],
        [FinancialAidStatus.PENDING_MANUAL_APPROVAL],
    )
    @ddt.unpack
    def test_get_course_price_for_learner_with_financial_aid(self, status):
        """
        Tests get_course_price_for_learner() who has approved financial aid
        """
        enrollment = ProgramEnrollment.objects.get(program=self.program, user=self.profile.user)
        financial_aid = FinancialAidFactory.create(
            user=self.profile.user,
            tier_program=self.tier_programs['25k'],
            status=status,
        )
        course_price = self.program.price
        expected_response = {
            "program_id": enrollment.program.id,
            "price": course_price - financial_aid.tier_program.discount_amount,
            "financial_aid_availability": True,
            "has_financial_aid_request": True
        }
        self.assertDictEqual(
            get_formatted_course_price(enrollment),
            expected_response
        )

    def test_get_course_price_for_learner_with_no_financial_aid_request(self):
        """
        Tests get_course_price_for_learner() who has no financial aid request
        """
        enrollment = ProgramEnrollment.objects.get(program=self.program, user=self.profile.user)
        # Enrolled and has no financial aid
        course_price = self.program.price
        expected_response = {
            "program_id": enrollment.program.id,
            "price": course_price,
            "financial_aid_availability": True,
            "has_financial_aid_request": False
        }
        self.assertDictEqual(
            get_formatted_course_price(enrollment),
            expected_response
        )

    def test_get_course_price_for_learner_with_financial_aid_in_reset(self):
        """
        Tests get_course_price_for_learner() who has financial aid request in status `reset`
        """
        enrollment = ProgramEnrollment.objects.get(program=self.program, user=self.profile.user)
        FinancialAidFactory.create(
            user=self.profile.user,
            tier_program=self.tier_programs['25k'],
            status=FinancialAidStatus.RESET,
        )
        # Enrolled and has no financial aid
        course_price = self.program.price
        expected_response = {
            "program_id": enrollment.program.id,
            "price": course_price,
            "financial_aid_availability": True,
            "has_financial_aid_request": False
        }
        self.assertDictEqual(
            get_formatted_course_price(enrollment),
            expected_response
        )

    def test_get_course_price_for_learner_in_no_financial_aid_program(self):
        """
        Tests get_course_price_for_learner() for a program without financial aid
        """
        enrollment = ProgramEnrollment.objects.get(program=self.program, user=self.profile.user)
        self.program.financial_aid_availability = False
        self.program.save()
        course_price = self.program.price
        expected_response = {
            "program_id": enrollment.program.id,
            "price": course_price,
            "financial_aid_availability": False,
            "has_financial_aid_request": False
        }
        self.assertDictEqual(
            get_formatted_course_price(enrollment),
            expected_response
        )


class ExchangeRateAPITests(MockedESTestCase):
    """
    Tests for financial aid exchange rate api backend
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        CurrencyExchangeRate.objects.create(
            currency_code="ABC",
            exchange_rate=1.5
        )
        CurrencyExchangeRate.objects.create(
            currency_code="DEF",
            exchange_rate=1.5
        )

    def test_update_currency_exchange_rate(self):
        """
        Tests updated_currency_exchange_rate()
        """
        latest_rates = {
            "ABC": 12.3,
            "GHI": 7.89
        }
        update_currency_exchange_rate(latest_rates)
        assert CurrencyExchangeRate.objects.get(currency_code="ABC").exchange_rate == latest_rates["ABC"]
        with self.assertRaises(CurrencyExchangeRate.DoesNotExist):
            CurrencyExchangeRate.objects.get(currency_code="DEF")
        assert CurrencyExchangeRate.objects.get(currency_code="GHI").exchange_rate == latest_rates["GHI"]
