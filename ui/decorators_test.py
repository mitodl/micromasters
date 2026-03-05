"""
Decorator tests
"""

from django.db.models.signals import post_save
from factory.django import mute_signals

from backends.edxorg import EdxOrgOAuth2
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase
from ui.url_utils import DASHBOARD_URL, PROFILE_URL


class DecoratorTests(MockedESTestCase):
    """
    Decorator tests for UI views
    """

    def create_user_and_login(self, agreed_to_terms_of_service, filled_out):
        """
        Create a user and social auth, and login that user
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(
                agreed_to_terms_of_service=agreed_to_terms_of_service,
                filled_out=filled_out,
            )
            profile.user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=f"{profile.user.username}_edx"
            )
        self.client.force_login(profile.user)

    def test_redirect_profile(self):
        """
        If user has not completed the profile, they should be redirected to the profile
        """
        self.create_user_and_login(
            agreed_to_terms_of_service=True,
            filled_out=False
        )

        resp = self.client.get(DASHBOARD_URL)
        self.assertRedirects(resp, PROFILE_URL)

    def test_no_redirect_profile(self):
        """
        If user is going to /profile anyway, don't redirect them
        """
        self.create_user_and_login(
            agreed_to_terms_of_service=True,
            filled_out=False
        )

        resp = self.client.get(PROFILE_URL)
        assert resp.status_code == 200

    def test_no_redirect(self):
        """
        If user has agreed to terms of service, don't redirect them
        """
        self.create_user_and_login(
            agreed_to_terms_of_service=True,
            filled_out=True
        )

        resp = self.client.get(DASHBOARD_URL)
        assert resp.status_code == 200
