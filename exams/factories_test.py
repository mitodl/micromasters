"""
Tests for exam factories
"""

from django.contrib.auth.models import User
from django.test import TestCase

from exams.factories import ProctoredProfileFactory
from exams.models import ProctoredProfile


class ProctoredProfileFactoryTest(TestCase):
    """
    Tests for ProctoredProfileFactory
    """
    def test_proctored_profile_factory_create(self):  # pylint: disable=no-self-use
        """
        Tests that ProctoredProfileFactory.create will create a user and a ProctoredProfile
        """
        assert ProctoredProfile.objects.count() == 0
        assert User.objects.count() == 0
        ProctoredProfileFactory.create()
        assert ProctoredProfile.objects.count() == 1
        assert User.objects.count() == 1
