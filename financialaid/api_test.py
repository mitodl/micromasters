"""
Tests for financial aid api
"""
import json

from datetime import datetime, timedelta
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals
from factory.fuzzy import FuzzyText

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from dashboard.models import ProgramEnrollment
from ecommerce.factories import CoursePriceFactory
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
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import Staff, Instructor


class FinancialAidBaseTestCase(TestCase):
    """
    Base test case for financial aid test setup
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create(
                country=FuzzyText(length=2)
            )
            cls.profile2 = ProfileFactory.create()
            cls.staff_user_profile = ProfileFactory.create()
            cls.staff_user_profile2 = ProfileFactory.create()
            cls.instructor_user_profile = ProfileFactory.create()
            cls.enrolled_profile = ProfileFactory.create()
            cls.enrolled_profile2 = ProfileFactory.create()
            cls.enrolled_profile3 = ProfileFactory.create()
            cls.multi_enrolled_profile = ProfileFactory.create()
        cls.program = ProgramFactory.create(
            financial_aid_availability=True,
            live=True
        )
        cls.course = CourseFactory.create(program=cls.program)
        cls.course_run = CourseRunFactory.create(
            enrollment_end=datetime.utcnow() + timedelta(hours=1),
            course=cls.course
        )
        cls.course_price = CoursePriceFactory.create(
            course_run=cls.course_run,
            is_valid=True
        )
        cls.tier_programs = {
            "0k": TierProgramFactory.create(program=cls.program, income_threshold=0, current=True),
            "25k": TierProgramFactory.create(program=cls.program, income_threshold=25000, current=True),
            "50k": TierProgramFactory.create(program=cls.program, income_threshold=50000, current=True),
            "75k": TierProgramFactory.create(
                program=cls.program,
                income_threshold=75000,
                current=True,
                discount_amount=0
            ),
            "75k_not_current": TierProgramFactory.create(program=cls.program, income_threshold=75000, current=False)
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
        cls.course2 = CourseFactory.create(program=cls.program2)
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
        # Program enrollments for course price
        cls.program_enrollment_ep1 = ProgramEnrollment.objects.create(
            user=cls.enrolled_profile.user,
            program=cls.program
        )
        cls.program_enrollment_ep2 = ProgramEnrollment.objects.create(
            user=cls.enrolled_profile2.user,
            program=cls.program
        )
        cls.program_enrollment_ep3 = ProgramEnrollment.objects.create(
            user=cls.enrolled_profile3.user,
            program=cls.program
        )
        cls.multi_enrollment1 = ProgramEnrollment.objects.create(
            user=cls.multi_enrolled_profile.user,
            program=cls.program
        )
        cls.multi_enrollment2 = ProgramEnrollment.objects.create(
            user=cls.multi_enrolled_profile.user,
            program=cls.program2
        )
        cls.financialaid_approved = FinancialAidFactory.create(
            user=cls.enrolled_profile.user,
            tier_program=cls.tier_programs["25k"],
            status=FinancialAidStatus.APPROVED
        )
        cls.financialaid_pending = FinancialAidFactory.create(
            user=cls.enrolled_profile2.user,
            tier_program=cls.tier_programs["25k"],
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL
        )
        # Country income thresholds (CountryIncomeThreshold objects already exist in the database, but since we
        # use fuzzy generators for cls.profile.country, it may not exist yet)
        cls.country_income_threshold_50000, _ = CountryIncomeThreshold.objects.get_or_create(
            country_code=cls.profile.country,
            defaults={
                "income_threshold": 50000
            }
        )
        if cls.country_income_threshold_50000.income_threshold != 50000:
            cls.country_income_threshold_50000.income_threshold = 50000
            cls.country_income_threshold_50000.save()
        cls.country_income_threshold_0 = CountryIncomeThreshold.objects.exclude(
            id=cls.country_income_threshold_50000.id
        ).first()
        cls.country_income_threshold_0.income_threshold = 0
        cls.country_income_threshold_0.save()

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
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        CurrencyExchangeRate.objects.create(
            currency_code="GHI",
            exchange_rate=1.5
        )

    def setUp(self):
        super().setUp()
        self.program.refresh_from_db()

    def test_determine_tier_program(self):
        """
        Tests determine_tier_program() assigning the correct tiers. This should assign the tier where the tier's
        income threshold is equal to or less than income.
        """
        assert determine_tier_program(self.program, 0) == self.tier_programs["0k"]
        assert determine_tier_program(self.program, 1000) == self.tier_programs["0k"]
        assert determine_tier_program(self.program, 25000) == self.tier_programs["25k"]
        assert determine_tier_program(self.program, 27500) == self.tier_programs["25k"]
        assert determine_tier_program(self.program, 50000) == self.tier_programs["50k"]
        assert determine_tier_program(self.program, 72800) == self.tier_programs["50k"]
        assert determine_tier_program(self.program, 75000) == self.tier_programs["75k"]
        assert determine_tier_program(self.program, 34938234) == self.tier_programs["75k"]
        assert determine_tier_program(self.program, 34938234) != self.tier_programs["75k_not_current"]

    def test_determine_tier_program_improper_setup(self):
        """
        Tests that determine_tier_program() raises ImproperlyConfigured if no $0-discount TierProgram
        has been created and income supplied is too low.
        """
        program = ProgramFactory.create()
        with self.assertRaises(ImproperlyConfigured):
            determine_tier_program(program, 0)

    def test_determine_auto_approval(self):  # pylint: disable=no-self-use
        """
        Tests determine_auto_approval() assigning the correct auto-approval status. This should return True
        if income is strictly greater than the threshold (or if the threshold is 0, which is inclusive of 0).
        """
        # Income threshold == 0
        assert self.country_income_threshold_0.income_threshold == 0
        financial_aid = FinancialAidFactory.create(
            income_usd=self.country_income_threshold_0.income_threshold+1,
            country_of_income=self.country_income_threshold_0.country_code
        )
        assert determine_auto_approval(financial_aid) is True
        financial_aid = FinancialAidFactory.create(
            income_usd=0,
            country_of_income=self.country_income_threshold_0.country_code
        )
        assert determine_auto_approval(financial_aid) is True

        # Income threshold greater than 0
        assert self.country_income_threshold_50000.income_threshold > 0
        financial_aid = FinancialAidFactory.create(
            income_usd=self.country_income_threshold_50000.income_threshold+1,
            country_of_income=self.country_income_threshold_50000.country_code
        )
        assert determine_auto_approval(financial_aid) is True
        financial_aid = FinancialAidFactory.create(
            income_usd=self.country_income_threshold_50000.income_threshold,
            country_of_income=self.country_income_threshold_50000.country_code
        )
        assert determine_auto_approval(financial_aid) is not True  # Only auto-approved if > income threshold
        financial_aid = FinancialAidFactory.create(
            income_usd=self.country_income_threshold_50000.income_threshold-1,
            country_of_income=self.country_income_threshold_50000.country_code
        )
        assert determine_auto_approval(financial_aid) is not True  # Only auto-approved if > income threshold
        financial_aid = FinancialAidFactory.create(
            income_usd=0,
            country_of_income=self.country_income_threshold_50000.country_code
        )
        assert determine_auto_approval(financial_aid) is not True  # Only auto-approved if > income threshold

    def test_determine_income_usd(self):  # pylint: disable=no-self-use
        """
        Tests determine_income_usd()
        """
        # original income is in USD
        assert determine_income_usd(5000, "USD") == 5000
        # original income is in GHI currency
        assert determine_income_usd(3000, "GHI") == 2000

    def test_get_no_discount_tier_program(self):
        """
        Tests get_no_discount_tier_program()
        """
        # 75k tier program is the one with no discount
        assert get_no_discount_tier_program(self.program.id).id == self.tier_programs["75k"].id
        with self.assertRaises(ImproperlyConfigured):
            # No tier programs have been created for self.program2
            assert get_no_discount_tier_program(self.program2.id)


class CoursePriceAPITests(FinancialAidBaseTestCase):
    """
    Tests for course price api backend
    """
    def setUp(self):
        super().setUp()
        self.program.refresh_from_db()

    def test_get_course_price_for_learner_with_approved_financial_aid(self):
        """
        Tests get_course_price_for_learner() who has approved financial aid
        """
        enrollment = self.program_enrollment_ep1
        expected_response = {
            "program_id": enrollment.program.id,
            "price": self.course_price.price - self.financialaid_approved.tier_program.discount_amount,
            "financial_aid_availability": True,
            "has_financial_aid_request": True
        }
        self.assertDictEqual(
            get_formatted_course_price(enrollment),
            expected_response
        )

    def test_get_course_price_for_learner_with_pending_financial_aid(self):
        """
        Tests get_course_price_for_learner() who has pending financial aid
        """
        enrollment = self.program_enrollment_ep2
        expected_response = {
            "program_id": enrollment.program.id,
            "price": self.course_price.price - self.financialaid_approved.tier_program.discount_amount,
            "financial_aid_availability": True,
            "has_financial_aid_request": True
        }
        self.assertDictEqual(
            get_formatted_course_price(enrollment),
            expected_response
        )

    def test_get_course_price_for_learner_with_no_financial_aid_request(self):
        """
        Tests get_course_price_for_learner() who has pending financial aid request
        """
        enrollment = self.program_enrollment_ep3
        # Enrolled and has no financial aid
        expected_response = {
            "program_id": enrollment.program.id,
            "price": self.course_price.price,
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
        enrollment = self.program_enrollment_ep3
        self.program.financial_aid_availability = False
        self.program.save()
        expected_response = {
            "program_id": enrollment.program.id,
            "price": self.course_price.price,
            "financial_aid_availability": False,
            "has_financial_aid_request": False
        }
        self.assertDictEqual(
            get_formatted_course_price(enrollment),
            expected_response
        )


class ExchangeRateAPITests(TestCase):
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
