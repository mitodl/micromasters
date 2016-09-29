"""
Tests for financialaid models
"""
from django.core.exceptions import ValidationError

from financialaid.factories import TierFactory, FinancialAidFactory
from financialaid.models import Tier
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
