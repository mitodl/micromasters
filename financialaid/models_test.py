"""
Tests for financialaid models
"""
from django.db.models.signals import post_save
from factory.django import mute_signals
from rest_framework.exceptions import ValidationError

from financialaid.constants import FinancialAidStatus
from financialaid.factories import (
    TierFactory,
    FinancialAidFactory
)
from financialaid.models import (
    Tier,
    FinancialAidAudit,
)
from micromasters.utils import serialize_model_object
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase


class FinancialAidModelsTests(MockedESTestCase):
    """
    Tests for financialaid models
    """
    def test_timestamped_model_update(self):
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
        # financial aid with same user and different program (new program created by the factory)
        FinancialAidFactory.create(user=financial_aid.user)
        # financial aid with same program and different user (new user created by the factory)
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

    def test_financial_aid_model_duplicate_if_reset(self):
        """
        Tests that FinancialAid objects can not be unique per User and Program
        if the other are in reset status
        """
        financial_aid = FinancialAidFactory.create()
        # change the first one to any state that is not `reset` will fail to create a new financial aid
        for status in FinancialAidStatus.ALL_STATUSES:
            if status == FinancialAidStatus.RESET:
                continue
            financial_aid.status = status
            financial_aid.save()
            with self.assertRaises(ValidationError):
                FinancialAidFactory.create(
                    user=financial_aid.user,
                    tier_program=financial_aid.tier_program
                )
        # reset status will allow a new financial aid
        financial_aid.status = FinancialAidStatus.RESET
        financial_aid.save()
        FinancialAidFactory.create(
            user=financial_aid.user,
            tier_program=financial_aid.tier_program
        )

    def test_save_and_log(self):
        """
        Tests that FinancialAid.save_and_log() creates an audit record with the correct information.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        acting_user = profile.user
        financial_aid = FinancialAidFactory.create()
        original_before_json = serialize_model_object(financial_aid)
        # Make sure audit object is created
        assert FinancialAidAudit.objects.count() == 0
        financial_aid.status = FinancialAidStatus.AUTO_APPROVED
        financial_aid.save_and_log(acting_user)
        assert FinancialAidAudit.objects.count() == 1
        # Make sure the before and after data are correct
        financial_aid.refresh_from_db()
        original_after_json = serialize_model_object(financial_aid)
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
        assert output of to_dict
        """
        financial_aid = FinancialAidFactory.create()
        assert financial_aid.to_dict() == serialize_model_object(financial_aid)
