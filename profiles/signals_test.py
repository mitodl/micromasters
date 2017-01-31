"""
Tests for signals
"""

from django.contrib.auth.models import User

from profiles.models import Profile
from search.base import MockedESTestCase


class SignalProfilesTest(MockedESTestCase):
    """
    Test class for signals that creates a profile whenever a user is created
    """

    def test_profile_creation(self):
        """
        Tests that if a user is created, the profile for such user is created
        """
        # there are no users
        assert len(User.objects.all()) == 0
        assert len(Profile.objects.all()) == 0

        # the creation of a user triggers the creation of a profile
        user = User.objects.create(username='test', password='test')
        assert len(User.objects.all()) == 1
        assert len(Profile.objects.all()) == 1
        assert Profile.objects.all()[0].user == user

        # saving again the user does not create another profile
        user.first_name = 'the'
        user.save()
        assert len(User.objects.all()) == 1
        assert len(Profile.objects.all()) == 1
