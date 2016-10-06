"""
Tests for financialaid models
"""
import datetime
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from factory.django import mute_signals

from financialaid.factories import (
    TierFactory,
    FinancialAidFactory
)
from financialaid.models import (
    Tier,
    FinancialAidAudit,
    FinancialAidStatus
)
from profiles.factories import ProfileFactory
from search.base import ESTestCase


class FinancialAidModelsTests(ESTestCase):
    """
    Tests for financialaid models
    """
    def test_timestamped_model_update(self):  # pylint: disable=no-self-use
        """
        Tests that timestamped models have update_on updated regardless of whether using .save() or .update()
        """
        tier = TierFactory.create()
        first_timestamp = tier.updated_on
        tier.save()
        second_timestamp = tier.updated_on
        assert first_timestamp != second_timestamp
        Tier.objects.filter(id=tier.id).update(name="new_tier")
        third_timestamp = Tier.objects.get(id=tier.id)  # Since we need to re-fetch the object
        assert second_timestamp != third_timestamp

    def test_financial_aid_model_unique(self):
        """
        Tests that FinancialAid objects are unique per User and Program
        """
        financial_aid = FinancialAidFactory.create()
        # Test creation of FinancialAid that isn't unique_together with "user" and "tier_program__program"
        FinancialAidFactory.create(user=financial_aid.user)
        FinancialAidFactory.create(tier_program=financial_aid.tier_program)
        # Test updating the original FinancialAid doesn't raise ValidationError
        financial_aid.income_usd = 100
        financial_aid.save()
        # Test creation should fail for FinancialAid already existing with the same "user" and "tier_program__program"
        with self.assertRaises(ValidationError):
            FinancialAidFactory.create(
                user=financial_aid.user,
                tier_program=financial_aid.tier_program
            )

    def test_save_and_log(self):  # pylint: disable=no-self-use
        """
        Tests that FinancialAid.save_and_log() creates an audit record with the correct information.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        acting_user = profile.user
        financial_aid = FinancialAidFactory.create()
        original_before_json = financial_aid.to_dict()
        # Make sure audit object is created
        assert FinancialAidAudit.objects.count() == 0
        financial_aid.status = FinancialAidStatus.AUTO_APPROVED
        financial_aid.save_and_log(acting_user)
        assert FinancialAidAudit.objects.count() == 1
        # Make sure the before and after data are correct
        financial_aid.refresh_from_db()
        original_after_json = financial_aid.to_dict()
        financial_aid_audit = FinancialAidAudit.objects.first()
        before_json = financial_aid_audit.data_before
        after_json = financial_aid_audit.data_after
        for field, value in before_json.items():
            # Data before
            if isinstance(value, float):
                # JSON serialization of FloatField is precise, so we need to do almost equal
                self.assertAlmostEqual(value, original_before_json[field])
            else:
                assert value == original_before_json[field]
        for field, value in after_json.items():
            # Data after
            if isinstance(value, float):
                # JSON serialization of FloatField is precise, so we need to do almost equal
                self.assertAlmostEqual(value, original_after_json[field])
            else:
                assert value == original_after_json[field]

    def test_to_dict(self):
        """
        Tests the to_dict() function on FinancialAid
        """
        financial_aid = FinancialAidFactory.create(date_documents_sent=datetime.datetime.now())
        financial_aid_dict = financial_aid.to_dict()
        audit_key_list = [
            "country_of_income",
            "date_documents_sent",
            "date_exchange_rate",
            "id",
            "income_usd",
            "justification",
            "original_currency",
            "original_income",
            "status",
            "tier_program",
            "user"
        ]
        assert set(financial_aid_dict.keys()) == set(audit_key_list)
        assert financial_aid_dict["user"] == financial_aid.user.id
        assert financial_aid_dict["tier_program"] == financial_aid.tier_program.id
        assert financial_aid_dict["status"] == financial_aid.status
        assert financial_aid_dict["original_currency"] == financial_aid.original_currency
        assert financial_aid_dict["country_of_income"] == financial_aid.country_of_income
        assert financial_aid_dict["date_exchange_rate"] == financial_aid.date_exchange_rate.isoformat()
        assert financial_aid_dict["date_documents_sent"] == financial_aid.date_documents_sent.isoformat()
        self.assertAlmostEqual(financial_aid_dict["income_usd"], financial_aid.income_usd)
        self.assertAlmostEqual(financial_aid_dict["original_income"], financial_aid.original_income)

    def test_to_dict_with_null_values(self):  # pylint: disable=no-self-use
        """
        Tests the to_dict() function on FinancialAid with none-values in date fields
        """
        financial_aid = FinancialAidFactory.create(date_exchange_rate=None, date_documents_sent=None)
        financial_aid_dict = financial_aid.to_dict()
        assert financial_aid_dict["date_exchange_rate"] is None
        assert financial_aid_dict["date_documents_sent"] is None
