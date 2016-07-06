"""
Tests for profile functions
"""

from mock import Mock

from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals
from testfixtures import LogCapture

from backends.edxorg import EdxOrgOAuth2
from profiles.api import get_social_username
from profiles.factories import ProfileFactory


class SocialTests(TestCase):
    """
    Tests for profile functions
    """

    def setUp(self):
        """
        Create a user with a default social auth
        """

        with mute_signals(post_save):
            profile = ProfileFactory.create(
                agreed_to_terms_of_service=True,
                filled_out=True,
            )
        self.user = profile.user
        self.user.social_auth.create(
            provider='not_edx',
        )
        self.social_username = "{}_edx".format(self.user.username)
        self.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid=self.social_username,
        )

    def test_anonymous_user(self):  # pylint: disable=no-self-use
        """
        get_social_username should return None for anonymous users
        """
        is_anonymous = Mock(return_value=True)
        user = Mock(is_anonymous=is_anonymous)
        assert get_social_username(user) is None
        assert is_anonymous.called

    def test_zero_social(self):
        """
        get_social_username should return None if there is no edX account associated yet
        """
        self.user.social_auth.all().delete()
        assert get_social_username(self.user) is None

    def test_one_social(self):
        """
        get_social_username should return the social username, not the Django username
        """
        assert get_social_username(self.user) == self.social_username

    def test_two_social(self):
        """
        get_social_username should return None if there are two social edX accounts for a user
        """

        self.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid='other name',
        )

        with LogCapture() as log_capture:
            assert get_social_username(self.user) is None
            log_capture.check(
                (
                    'profiles.api',
                    'ERROR',
                    'Unexpected error retrieving social auth username: get() returned more than '
                    'one UserSocialAuth -- it returned 2!'
                )
            )
