"""
Test end to end django views.
"""
import json

from django.db.models.signals import post_save
from django.test import TestCase
from django.test.client import Client
from factory.django import mute_signals
from factory.fuzzy import FuzzyText

from cms.models import HomePage
from backends.edxorg import EdxOrgOAuth2
from courses.factories import ProgramFactory
from profiles.factories import ProfileFactory
from ui.urls import DASHBOARD_URL


class TestViews(TestCase):
    """
    Test that the views work as expected.
    """
    def setUp(self):
        """Common test setup"""
        super(TestViews, self).setUp()
        self.client = Client()

    def create_and_login_user(self):
        """
        Create and login a user
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(
                agreed_to_terms_of_service=True,
                filled_out=True,
            )
        profile.user.social_auth.create(
            provider='not_edx',
        )
        profile.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(profile.user.username),
        )
        self.client.force_login(profile.user)
        return profile.user

    def test_program_liveness(self):
        """Verify only 'live' program visible on homepage"""
        program_live_true = ProgramFactory.create(live=True)
        program_live_false = ProgramFactory.create(live=False)
        response = self.client.get('/')
        self.assertContains(
            response,
            program_live_true.title,
            status_code=200
        )
        self.assertNotContains(
            response,
            program_live_false.title,
            status_code=200
        )

    def test_login_button(self):
        """Verify that we see a login button if not logged in"""
        response = self.client.get('/')
        self.assertContains(response, "Sign in with edX.org")

    def test_sign_out_button(self):
        """Verify that we see a sign out button if logged in"""
        self.create_and_login_user()
        response = self.client.get('/')
        self.assertContains(response, 'Sign out')

    def test_index_context_anonymous(self):
        """
        Assert context values when anonymous
        """
        ga_tracking_id = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
        ):
            response = self.client.get('/')
            assert response.context['authenticated'] is False
            assert response.context['username'] is None
            assert response.context['title'] == HomePage.objects.first().title
            js_settings = json.loads(response.context['js_settings_json'])
            assert js_settings['gaTrackingID'] == ga_tracking_id

    def test_index_context_logged_in_social_auth(self):
        """
        Assert context values when logged in as social auth user
        """
        user = self.create_and_login_user()
        ga_tracking_id = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
        ):
            response = self.client.get('/')
            assert response.context['authenticated'] is True
            assert response.context['username'] == user.social_auth.get(provider=EdxOrgOAuth2.name).uid
            assert response.context['title'] == HomePage.objects.first().title
            js_settings = json.loads(response.context['js_settings_json'])
            assert js_settings['gaTrackingID'] == ga_tracking_id

    def test_index_context_logged_in_staff(self):
        """
        Assert context values when logged in as staff
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
            self.client.force_login(profile.user)

        ga_tracking_id = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
        ):
            response = self.client.get('/')
            assert response.context['authenticated'] is True
            assert response.context['username'] is None
            assert response.context['title'] == HomePage.objects.first().title
            js_settings = json.loads(response.context['js_settings_json'])
            assert js_settings['gaTrackingID'] == ga_tracking_id

    def test_dashboard_settings(self):
        """
        Assert settings we pass to dashboard
        """
        user = self.create_and_login_user()

        ga_tracking_id = FuzzyText().fuzz()
        react_ga_debug = FuzzyText().fuzz()
        edx_base_url = FuzzyText().fuzz()
        host = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
            REACT_GA_DEBUG=react_ga_debug,
            EDXORG_BASE_URL=edx_base_url,
            WEBPACK_DEV_SERVER_HOST=host
        ):
            resp = self.client.get(DASHBOARD_URL)
            js_settings = json.loads(resp.context['js_settings_json'])
            assert js_settings == {
                'gaTrackingID': ga_tracking_id,
                'reactGaDebug': react_ga_debug,
                'authenticated': True,
                'name': user.profile.preferred_name,
                'username': user.social_auth.get(provider=EdxOrgOAuth2.name).uid,
                'host': host,
                'edx_base_url': edx_base_url
            }

    def test_unauthenticated_user_redirect(self):
        """Verify that an unauthenticated user can't visit '/dashboard'"""
        response = self.client.get(DASHBOARD_URL)
        self.assertRedirects(
            response,
            "/?next={}".format(DASHBOARD_URL)
        )

    def test_authenticated_user_doesnt_redirect(self):
        """Verify that we let an authenticated user through to '/dashboard'"""
        self.create_and_login_user()
        response = self.client.get(DASHBOARD_URL)
        self.assertContains(
            response,
            "MicroMaster’s",
            status_code=200
        )

    def test_webpack_url(self):
        """Verify that webpack bundle src shows up in production"""
        for debug, expected_url in [
                (True, "foo_server:0000/style.js"),
                (False, "bundles/style.js")
        ]:
            with self.settings(
                DEBUG=debug,
                USE_WEBPACK_DEV_SERVER=True,
                WEBPACK_DEV_SERVER_HOST='foo_server',
                WEBPACK_DEV_SERVER_PORT='0000',
            ):
                response = self.client.get('/')
                self.assertContains(
                    response,
                    expected_url,
                    status_code=200
                )

                js_settings = json.loads(response.context['js_settings_json'])
                assert js_settings['host'] == 'foo_server'
