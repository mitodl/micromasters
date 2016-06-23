"""
Test end to end django views.
"""
import json

from django.db.models.signals import post_save
from django.test import TestCase
from django.core.urlresolvers import reverse
from factory.django import mute_signals
from factory.fuzzy import FuzzyText
from mock import patch, Mock
from rest_framework import status

from cms.models import HomePage, ProgramPage
from courses.models import Program
from courses.factories import ProgramFactory
from backends.edxorg import EdxOrgOAuth2
from profiles.factories import ProfileFactory
from ui.urls import DASHBOARD_URL


class ViewsTests(TestCase):
    """
    Test that the views work as expected.
    """
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


class TestHomePage(ViewsTests):
    """
    Tests for home page
    """

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

    def test_program_link(self):
        """Verify that program links are present in home page if ProgramPage is set"""
        program = ProgramFactory.create(live=True)
        program_page = ProgramPage(program=program, title="Test Program")

        response = self.client.get('/')
        self.assertNotContains(
            response,
            program_page.url,
            status_code=200
        )

        homepage = HomePage.objects.first()
        homepage.add_child(instance=program_page)
        program_page.save_revision().publish()

        response = self.client.get('/')
        self.assertContains(
            response,
            program_page.url,
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


class DashboardTests(ViewsTests):
    """
    Tests for dashboard views
    """
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
            "MicroMasters",
            status_code=200
        )


class HandlerTests(ViewsTests):
    """
    Tests for 404 and 500 handlers
    """
    def test_404_error_context_logged_in(self):
        """
        Assert context values for 404 error page when logged in
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
            self.client.force_login(profile.user)

        # case with specific page
        response = self.client.get('/404/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.context['authenticated'] is True
        assert response.context['name'] == profile.preferred_name

        # case with a fake page
        with self.settings(DEBUG=False):
            response = self.client.get('/gfh0o4n8741387jfmnub134fn348fr38f348f/')
            assert response.status_code == status.HTTP_404_NOT_FOUND
            assert response.context['authenticated'] is True
            assert response.context['name'] == profile.preferred_name

    def test_404_error_context_logged_out(self):
        """
        Assert context values for 404 error page when logged out
        """
        # case with specific page
        response = self.client.get('/404/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.context['authenticated'] is False
        assert response.context['name'] == ""

        # case with a fake page
        with self.settings(DEBUG=False):
            response = self.client.get('/gfh0o4n8741387jfmnub134fn348fr38f348f/')
            assert response.status_code == status.HTTP_404_NOT_FOUND
            assert response.context['authenticated'] is False
            assert response.context['name'] == ""

    def test_500_error_context_logged_in(self):
        """
        Assert context values for 500 error page when logged in
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
            self.client.force_login(profile.user)

        response = self.client.get('/500/')
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.context['authenticated'] is True
        assert response.context['name'] == profile.preferred_name

    def test_500_error_context_logged_out(self):
        """
        Assert context values for 500 error page when logged out
        """
        # case with specific page
        response = self.client.get('/500/')
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.context['authenticated'] is False
        assert response.context['name'] == ""


class TestProgramPage(ViewsTests):
    """
    Test that the ProgramPage view work as expected.
    """
    def setUp(self):
        homepage = HomePage.objects.first()
        program = Program(title="Test Program Title", live=True)
        program.save()
        self.program_page = ProgramPage(program=program, title="Test Program")
        homepage.add_child(instance=self.program_page)
        self.program_page.save_revision().publish()

    def test_program_page_context_anonymous(self):
        """
        Assert context values when anonymous
        """
        ga_tracking_id = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
        ):
            response = self.client.get(self.program_page.url)
            assert response.context['authenticated'] is False
            assert response.context['username'] is None
            assert response.context['title'] == "Test Program"
            js_settings = json.loads(response.context['js_settings_json'])
            assert js_settings['gaTrackingID'] == ga_tracking_id

    def test_login_button(self):
        """Verify that we see a login button if not logged in"""
        response = self.client.get(self.program_page.url)
        self.assertContains(response, "Sign in with edX.org")

    def test_sign_out_button(self):
        """Verify that we see a sign out button if logged in"""
        self.create_and_login_user()
        response = self.client.get(self.program_page.url)
        self.assertContains(response, 'Sign out')


class TestUsersPage(ViewsTests):
    """
    Tests for user page
    """

    def test_users_logged_in(self):
        """
        Assert settings we pass to dashboard
        """
        user = self.create_and_login_user()
        username = user.social_auth.get(provider=EdxOrgOAuth2.name).uid

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
            # Mock has_permission so we don't worry about testing permissions here
            has_permission = Mock(return_value=True)
            with patch('profiles.permissions.CanSeeIfNotPrivate.has_permission', has_permission):
                resp = self.client.get(reverse('ui-users', kwargs={'user': username}))
                assert resp.status_code == 200
                js_settings = json.loads(resp.context['js_settings_json'])
                assert js_settings == {
                    'gaTrackingID': ga_tracking_id,
                    'reactGaDebug': react_ga_debug,
                    'authenticated': True,
                    'name': user.profile.preferred_name,
                    'username': username,
                    'host': host,
                    'edx_base_url': edx_base_url
                }
                assert has_permission.called

    def test_users_anonymous(self):
        """
        Assert settings we pass to dashboard
        """
        user = self.create_and_login_user()
        self.client.logout()
        username = user.social_auth.get(provider=EdxOrgOAuth2.name).uid

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
            # Mock has_permission so we don't worry about testing permissions here
            has_permission = Mock(return_value=True)
            with patch('profiles.permissions.CanSeeIfNotPrivate.has_permission', has_permission):
                resp = self.client.get(reverse('ui-users', kwargs={'user': username}))
                assert resp.status_code == 200
                js_settings = json.loads(resp.context['js_settings_json'])
                assert js_settings == {
                    'gaTrackingID': ga_tracking_id,
                    'reactGaDebug': react_ga_debug,
                    'authenticated': False,
                    'name': "",
                    'username': None,
                    'host': host,
                    'edx_base_url': edx_base_url
                }
                assert has_permission.called

    def test_users_404(self):
        """
        Assert that if we look at a user we don't have permission to see, we get a 404
        """
        resp = self.client.get(
            reverse('ui-users', kwargs={'user': 'missing'})
        )
        assert resp.status_code == 404

    def test_users_index_logged_in(self):
        """
        Assert that a logged in user gets a 200 going to /users/
        """
        self.create_and_login_user()
        resp = self.client.get(reverse('ui-users'))
        # We don't actually direct here, that happens via react-router
        assert resp.status_code == 200

    def test_users_index_anonymous(self):
        """
        Assert that an anonymous user gets a 404 going to /users/
        """
        resp = self.client.get(reverse('ui-users'))
        assert resp.status_code == 404
