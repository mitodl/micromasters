"""
Tests for financial aid serializers
"""
from unittest.mock import MagicMock
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from factory.django import mute_signals
from rest_framework.exceptions import ValidationError

from courses.factories import ProgramFactory
from financialaid.factories import TierProgramFactory, FinancialAidFactory
from financialaid.constants import FinancialAidStatus
from financialaid.serializers import FinancialAidDashboardSerializer, FinancialAidRequestSerializer
from micromasters.factories import UserFactory
from micromasters.utils import now_in_utc
from profiles.factories import ProfileFactory
from dashboard.factories import ProgramEnrollmentFactory
from search.base import MockedESTestCase


class FinancialAidDashboardSerializerTests(MockedESTestCase):
    """
    Tests for FinancialAidDashboardSerializer
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user = UserFactory.create()
        cls.program = ProgramFactory.create(live=True, financial_aid_availability=True, price=1000)
        cls.min_tier_program = TierProgramFactory.create(
            program=cls.program,
            discount_amount=750,
            current=True
        )
        cls.max_tier_program = TierProgramFactory.create(
            program=cls.program,
            discount_amount=0,
            current=True
        )

    def test_financial_aid_with_application(self):
        """
        Test that a user that has a FinancialAid record with a non-reset status will have serialized financial aid
        information that indicates that they have applied
        """
        fin_aid = FinancialAidFactory.create(
            user=self.user,
            tier_program=self.min_tier_program,
            date_documents_sent=None,
        )
        serialized = FinancialAidDashboardSerializer.serialize(self.user, self.program)
        assert serialized == {
            "id": fin_aid.id,
            "has_user_applied": True,
            "application_status": fin_aid.status,
            "min_possible_cost": 250,
            "max_possible_cost": 1000,
            "date_documents_sent": None,
        }

    def test_financial_aid_with_application_in_reset(self):
        """
        Test that a user that has a FinancialAid record with the reset status will have serialized financial aid
        information that indicates that they have not applied
        """
        FinancialAidFactory.create(
            user=self.user,
            tier_program=self.min_tier_program,
            date_documents_sent=None,
            status=FinancialAidStatus.RESET
        )
        serialized = FinancialAidDashboardSerializer.serialize(self.user, self.program)
        assert serialized == {
            "id": None,
            "has_user_applied": False,
            "application_status": None,
            "min_possible_cost": 250,
            "max_possible_cost": 1000,
            "date_documents_sent": None,
        }

    def test_financial_aid_with_documents_sent(self):
        """
        Test that a user that has a FinancialAid record and has sent documents will have serialized financial aid
        information that indicates the date that documents were sent
        """
        now = now_in_utc()
        fin_aid = FinancialAidFactory.create(
            user=self.user,
            tier_program=self.min_tier_program,
            date_documents_sent=now,
        )
        serialized = FinancialAidDashboardSerializer.serialize(self.user, self.program)
        assert serialized == {
            "id": fin_aid.id,
            "has_user_applied": True,
            "application_status": fin_aid.status,
            "min_possible_cost": 250,
            "max_possible_cost": 1000,
            "date_documents_sent": now.date(),
        }

    def test_course_tier_mandatory(self):
        """
        Test that an attempt to serialize financial aid information will raise an exception if no tiers are created.
        """
        new_program = ProgramFactory.create(live=True, financial_aid_availability=True, price=1000)
        with self.assertRaises(ImproperlyConfigured):
            FinancialAidDashboardSerializer.serialize(self.user, new_program)

    def test_with_non_financial_aid_program(self):
        """
        Test that a non-financial aid program will serialize to an empty dict
        """
        non_fa_program = ProgramFactory.create(live=True, financial_aid_availability=False)
        assert FinancialAidDashboardSerializer.serialize(self.user, non_fa_program) == {}

    def test_financial_aid_with_application_with_no_residence(self):
        """
        Test that financialAid request serializer throws exception when profile is not filled out.
        """
        user = UserFactory.create()
        assert user.profile.filled_out is False
        ProgramEnrollmentFactory.create(user=user, program=self.program)
        serializer = FinancialAidRequestSerializer(
            data={
                'program_id': self.program.id,
                'tier_program': self.min_tier_program,
                'date_documents_sent': None,
                'original_currency': 'USD',
                'original_income': 1000
            },
            context={
                'request': MagicMock(user=user)
            }
        )
        with self.assertRaises(ValidationError) as ex:
            serializer.is_valid(raise_exception=True)
            serializer.save()

        assert ex.exception.detail == {'non_field_errors': ['Profile is not complete']}

    def test_financial_aid_with_application_with_full_profile(self):
        """
        Test that financialAid request serializer works when profile is filled out.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()

        ProgramEnrollmentFactory.create(user=profile.user, program=self.program)
        original_currency = 'USD'
        original_income = 1000.0
        serializer = FinancialAidRequestSerializer(
            data={
                'program_id': self.program.id,
                'tier_program': self.min_tier_program,
                'date_documents_sent': None,
                'original_currency': original_currency,
                'original_income': original_income
            },
            context={
                'request': MagicMock(user=profile.user)
            }
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        assert serializer.data == {
            'original_currency': original_currency,
            'original_income': original_income,
            'program_id': self.program.id
        }
