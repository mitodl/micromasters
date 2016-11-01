"""
Test end to end django views.
"""
import json

from django.db.models.signals import post_save
from django.core.urlresolvers import reverse
from django.test import override_settings
from factory.django import mute_signals
from factory.fuzzy import FuzzyText
from mock import patch, Mock
from rest_framework import status
from rolepermissions.shortcuts import available_perm_status
from wagtail.wagtailimages.models import Image
from wagtail.wagtailimages.tests.utils import get_test_image_file

from cms.models import HomePage, ProgramPage
from courses.models import Program
from courses.factories import ProgramFactory, CourseFactory
from backends.edxorg import EdxOrgOAuth2
from profiles.api import get_social_username
from profiles.factories import ProfileFactory
from roles.models import Role
from search.base import ESTestCase
from ui.urls import DASHBOARD_URL, TERMS_OF_SERVICE_URL


class ViewsTests(ESTestCase):
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
        return profile


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
        self.assertContains(response, "Sign Up")

    def test_sign_out_button(self):
        """Verify that we see a sign out button if logged in"""
        self.create_and_login_user()
        response = self.client.get('/')
        self.assertContains(response, 'Sign Out')

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
        profile = self.create_and_login_user()
        user = profile.user
        ga_tracking_id = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
        ):
            response = self.client.get('/')
            assert response.context['authenticated'] is True
            assert response.context['username'] == get_social_username(user)
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

    def test_program_order(self):
        """
        Assert that programs are output in id order
        """
        for i in range(10):
            ProgramFactory.create(live=True, title="Program {}".format(i + 1))
        response = self.client.get("/")
        content = response.content.decode('utf-8')
        indexes = [content.find("Program {}".format(i + 1)) for i in range(10)]
        assert indexes == sorted(indexes)


class DashboardTests(ViewsTests):
    """
    Tests for dashboard views
    """
    def test_dashboard_settings(self):
        """
        Assert settings we pass to dashboard
        """
        profile = self.create_and_login_user()
        user = profile.user

        ga_tracking_id = FuzzyText().fuzz()
        react_ga_debug = FuzzyText().fuzz()
        edx_base_url = FuzzyText().fuzz()
        host = FuzzyText().fuzz()
        email_support = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
            REACT_GA_DEBUG=react_ga_debug,
            EDXORG_BASE_URL=edx_base_url,
            WEBPACK_DEV_SERVER_HOST=host,
            EMAIL_SUPPORT=email_support,
            VERSION='0.0.1',
            RAVEN_CONFIG={'dsn': ''}
        ):
            resp = self.client.get(DASHBOARD_URL)
            js_settings = json.loads(resp.context['js_settings_json'])
            assert js_settings == {
                'gaTrackingID': ga_tracking_id,
                'reactGaDebug': react_ga_debug,
                'user': {
                    'email': user.email,
                    'username': get_social_username(user),
                    'first_name': profile.first_name,
                    'last_name': profile.last_name,
                    'preferred_name': profile.preferred_name,
                },
                'host': host,
                'edx_base_url': edx_base_url,
                'roles': [],
                'search_url': reverse('search_api', kwargs={"elastic_url": ""}),
                'support_email': email_support,
                'environment': 'dev',
                'release_version': '0.0.1',
                'sentry_dsn': None
            }

    def test_roles_setting(self):
        """
        Assert SETTINGS when a user has roles assigned to them
        """
        profile = self.create_and_login_user()

        Role.objects.create(
            program=ProgramFactory.create(),
            user=profile.user,
            role=Role.DEFAULT_ROLE,
        )

        resp = self.client.get(DASHBOARD_URL)
        js_settings = json.loads(resp.context['js_settings_json'])
        assert js_settings['roles'] == [
            {
                'program': role.program.id,
                'role': role.role,
                'permissions': [key for key, value in available_perm_status(profile.user).items() if value is True],
            } for role in profile.user.role_set.all()
        ]

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
            profile = self.create_and_login_user()
            self.client.force_login(profile.user)

        # case with specific page
        with override_settings(EMAIL_SUPPORT='support'):
            response = self.client.get('/404/')
            assert response.status_code == status.HTTP_404_NOT_FOUND
            assert response.context['authenticated'] is True
            assert response.context['name'] == profile.preferred_name
            assert response.context['support_email'] == 'support'

            # case with a fake page
            with self.settings(DEBUG=False):
                response = self.client.get('/gfh0o4n8741387jfmnub134fn348fr38f348f/')
                assert response.status_code == status.HTTP_404_NOT_FOUND
                assert response.context['authenticated'] is True
                assert response.context['name'] == profile.preferred_name
                assert response.context['support_email'] == 'support'

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
            profile = self.create_and_login_user()
            self.client.force_login(profile.user)

        with override_settings(EMAIL_SUPPORT='support'):
            response = self.client.get('/500/')
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert response.context['authenticated'] is True
            assert response.context['name'] == profile.preferred_name
            assert response.context['support_email'] == 'support'

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
        super(TestProgramPage, self).setUp()
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
        """Verify that we see a login button"""
        response = self.client.get(self.program_page.url)
        self.assertContains(response, "Sign Up Now")

    def test_program_thumbnail_default(self):
        """Verify that a default thumbnail shows up for a live program"""
        self.create_and_login_user()

        default_image = 'images/course-thumbnail.png'
        # the default image should not show up if no program is live
        program = self.program_page.program
        program.live = False
        program.save()
        resp = self.client.get('/')
        self.assertNotContains(resp, default_image)

        # default image should show up if a program is live and no thumbnail image was set
        program.live = True
        program.save()
        resp = self.client.get('/')
        self.assertContains(resp, default_image)

    def test_program_thumbnail(self):
        """Verify that a thumbnail shows up if specified for a ProgramPage"""
        self.create_and_login_user()

        image = Image.objects.create(title='Test image',
                                     file=get_test_image_file())

        self.program_page.thumbnail_image = image
        self.program_page.save()

        resp = self.client.get('/')
        self.assertContains(resp, image.get_rendition('fill-690x530').url)

    def test_course_listing(self):
        """
        Verify that courses are being serialized to JS in the correct order
        """
        # Create several courses in the program
        courses = [
            CourseFactory.create(
                program=self.program_page.program,
                position_in_program=i,
            )
            for i in range(5)
        ]
        # render the page
        response = self.client.get(self.program_page.url)
        js_settings = json.loads(response.context['js_settings_json'])
        # check that the courses are in the response
        self.assertIn("courses", js_settings)
        self.assertEqual(len(js_settings["courses"]), 5)
        # check that they're in the correct order
        for course, js_course in zip(courses, js_settings["courses"]):
            self.assertEqual(course.title, js_course["title"])
            self.assertEqual(course.description, js_course["description"])
            self.assertEqual(course.url, js_course["url"])


class TestUsersPage(ViewsTests):
    """
    Tests for user page
    """

    def test_users_logged_in(self):
        """
        Assert settings we pass to dashboard
        """
        profile = self.create_and_login_user()
        user = profile.user
        username = get_social_username(user)

        ga_tracking_id = FuzzyText().fuzz()
        react_ga_debug = FuzzyText().fuzz()
        edx_base_url = FuzzyText().fuzz()
        host = FuzzyText().fuzz()
        email_support = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
            REACT_GA_DEBUG=react_ga_debug,
            EDXORG_BASE_URL=edx_base_url,
            WEBPACK_DEV_SERVER_HOST=host,
            EMAIL_SUPPORT=email_support,
            VERSION='0.0.1',
            RAVEN_CONFIG={'dsn': ''}
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
                    'user': {
                        'email': user.email,
                        'username': username,
                        'first_name': profile.first_name,
                        'last_name': profile.last_name,
                        'preferred_name': profile.preferred_name,
                    },
                    'host': host,
                    'edx_base_url': edx_base_url,
                    'roles': [],
                    'search_url': reverse('search_api', kwargs={"elastic_url": ""}),
                    'support_email': email_support,
                    'environment': 'dev',
                    'release_version': '0.0.1',
                    'sentry_dsn': None
                }
                assert has_permission.called

    def test_users_anonymous(self):
        """
        Assert settings we pass to dashboard
        """
        profile = self.create_and_login_user()
        user = profile.user
        self.client.logout()
        username = get_social_username(user)

        ga_tracking_id = FuzzyText().fuzz()
        react_ga_debug = FuzzyText().fuzz()
        edx_base_url = FuzzyText().fuzz()
        host = FuzzyText().fuzz()
        email_support = FuzzyText().fuzz()
        with self.settings(
            GA_TRACKING_ID=ga_tracking_id,
            REACT_GA_DEBUG=react_ga_debug,
            EDXORG_BASE_URL=edx_base_url,
            WEBPACK_DEV_SERVER_HOST=host,
            EMAIL_SUPPORT=email_support,
            VERSION='0.0.1',
            RAVEN_CONFIG={'dsn': ''}
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
                    'user': None,
                    'host': host,
                    'edx_base_url': edx_base_url,
                    'roles': [],
                    'search_url': reverse('search_api', kwargs={"elastic_url": ""}),
                    'support_email': email_support,
                    'environment': 'dev',
                    'release_version': '0.0.1',
                    'sentry_dsn': None
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
        Assert that a logged in user gets a 200 going to /learner/
        """
        self.create_and_login_user()
        resp = self.client.get(reverse('ui-users'))
        # We don't actually direct here, that happens via react-router
        assert resp.status_code == 200

    def test_users_index_anonymous(self):
        """
        Assert that an anonymous user gets a 404 going to /learner/
        """
        resp = self.client.get(reverse('ui-users'))
        assert resp.status_code == 404


class TestTermsOfService(ViewsTests):
    """
    tests for the ToS page
    """

    def test_tos_settings(self):
        """
        test the settings we pass to the ToS page
        """
        response = self.client.get(TERMS_OF_SERVICE_URL)
        js_settings = json.loads(response.context['js_settings_json'])
        assert {'environment', 'release_version', 'sentry_dsn'}.issubset(set(js_settings.keys()))
