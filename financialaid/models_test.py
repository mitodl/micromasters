"""
Tests for financialaid models
"""
from financialaid.factories import TierFactory
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
