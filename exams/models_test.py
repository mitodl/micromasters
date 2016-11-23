
"""
Tests for exam factories
"""

from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals

from exams.models import ProctoredProfile
from profiles.factories import ProfileFactory


class ProctoredProfileTest(TestCase):
    """
    Tests for ProctoredProfile
    """
    def test_proctored_profile_create(self):  # pylint: disable=no-self-use
        """
        Tests that ProctoredProfile.create will create a ProctoredProfile
        """
        assert ProctoredProfile.objects.count() == 0
        with mute_signals(post_save):
            profile = ProfileFactory.create()
            profile.first_name = "\u0419\u046D"  # chars outside CP-1252
            profile.save()
        proctored_profile = ProctoredProfile.create(profile)
        proctored_profile.save()
        assert ProctoredProfile.objects.count() == 1
        assert proctored_profile.first_name == ""
