"""
Tests for financialaid factories
"""
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals

from financialaid.factories import FinancialAidFactory
from financialaid.models import FinancialAid
from micromasters.factories import UserFactory
from profiles.models import Profile


class FinancialAidModelsTests(TestCase):
    """
    Tests for financialaid factories
    """
    def test_financial_aid_factory_create(self):
        """
        Tests that FinancialAidFactory.create() will create a profile for the user field if a user is not specified
        """
        assert FinancialAid.objects.count() == 0
        assert User.objects.count() == 0
        assert Profile.objects.count() == 0
        FinancialAidFactory.create()
        assert FinancialAid.objects.count() == 1
        assert User.objects.count() == 1
        assert Profile.objects.count() == 1

    def test_financial_aid_factory_create_with_user(self):
        """
        Tests that FinancialAidFactory.create() will still work normally if provided a User object
        """
        with mute_signals(post_save):
            user = UserFactory.create()
        assert FinancialAid.objects.count() == 0
        assert User.objects.count() == 1
        assert Profile.objects.count() == 0
        FinancialAidFactory.create(user=user)
        assert FinancialAid.objects.count() == 1
        assert User.objects.count() == 1
        assert Profile.objects.count() == 0
