"""
Tests for exam factories
"""

from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals

from exams.factories import ProctoredProfileFactory
from exams.models import ProctoredProfile
from profiles.factories import ProfileFactory
from profiles.models import Profile


class ProctoredProfileFactoryTest(TestCase):
    """
    Tests for ProctoredProfileFactory
    """
    def test_proctored_profile_factory_create_no_user(self):  # pylint: disable=no-self-use
        """
        Tests that ProctoredProfileFactory.create will create a User, Profile, and a ProctoredProfile
        """
        assert ProctoredProfile.objects.count() == 0
        assert User.objects.count() == 0
        assert Profile.objects.count() == 0
        ProctoredProfileFactory.create()
        assert ProctoredProfile.objects.count() == 1
        assert User.objects.count() == 1
        assert Profile.objects.count() == 1

    def test_proctored_profile_factory_create_with_user(self):  # pylint: disable=no-self-use
        """
        Tests that ProctoredProfileFactory.create will create a user and a ProctoredProfile
        """
        assert ProctoredProfile.objects.count() == 0
        assert User.objects.count() == 0
        assert Profile.objects.count() == 0
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        assert User.objects.count() == 1
        assert Profile.objects.count() == 1
        ProctoredProfileFactory.create(user=profile.user)
        assert ProctoredProfile.objects.count() == 1
        assert User.objects.count() == 1
        assert Profile.objects.count() == 1
