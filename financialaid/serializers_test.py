"""
Tests for financial aid serializers
"""
from django.core.exceptions import ImproperlyConfigured

from courses.factories import ProgramFactory
from financialaid.factories import TierProgramFactory, FinancialAidFactory
from financialaid.constants import FinancialAidStatus
from financialaid.serializers import FinancialAidDashboardSerializer
from micromasters.factories import UserFactory
from micromasters.utils import now_in_utc
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
