"""
Tests for profile functions
"""

from unittest.mock import Mock

from django.core.exceptions import MultipleObjectsReturned
from testfixtures import LogCapture

from backends.edxorg import EdxOrgOAuth2

from profiles.api import get_social_username, get_social_auth
from profiles.factories import SocialProfileFactory
from micromasters.factories import UserSocialAuthFactory
from search.base import MockedESTestCase


class SocialTests(MockedESTestCase):
    """
    Tests for profile functions
    """

    def setUp(self):
        """
        Create a user with a default social auth
        """
        super(SocialTests, self).setUp()

        profile = SocialProfileFactory.create(
            agreed_to_terms_of_service=True,
            filled_out=True,
        )
        self.user = profile.user
        UserSocialAuthFactory.create(user=self.user, provider='not_edx')

    def test_anonymous_user(self):
        """
        get_social_username should return None for anonymous users
        """
        user = Mock(is_anonymous=True)
        assert get_social_username(user) is None

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
        assert get_social_username(self.user) == self.user.social_auth.first().uid

    def test_two_social(self):
        """
        get_social_username should return None if there are two social edX accounts for a user
        """
        UserSocialAuthFactory.create(user=self.user, uid='other name')

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

    def test_get_social_auth(self):
        """
        Tests that get_social_auth returns a user's edX social auth object, and if multiple edX social auth objects
        exists, it raises an exception
        """
        assert get_social_auth(self.user) == self.user.social_auth.get(provider=EdxOrgOAuth2.name)
        UserSocialAuthFactory.create(user=self.user, uid='other name')
        with self.assertRaises(MultipleObjectsReturned):
            get_social_auth(self.user)
