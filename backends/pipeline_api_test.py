"""
Tests for the pipeline APIs
"""
from unittest import mock
from urllib.parse import urljoin
import ddt

from backends import pipeline_api, edxorg
from courses.factories import ProgramFactory
from profiles.api import get_social_username
from profiles.models import Profile
from profiles.factories import UserFactory
from profiles.util import split_name
from roles.models import (
    Instructor,
    Role,
    Staff,
)
from search.base import MockedESTestCase


@ddt.ddt
class EdxPipelineApiTest(MockedESTestCase):
    """
    Test class for APIs run during the Python Social Auth
    authentication pipeline.
    """

    def check_empty_profile(self, profile):
        """
        Helper function that checks if a profile is empty
        """
        profile.refresh_from_db()
        for field in profile._meta.get_fields():  # pylint: disable=protected-access
            key = field.name
            if key in (
                    'id',
                    'user',
                    'date_joined_micromasters',
                    'student_id',
                    'work_history',
                    'education',
                    'updated_on',
                    'exam_profile',
                    'mail_id',
                    'fake_user',
            ):
                continue
            if key == 'account_privacy':
                assert getattr(profile, key) == Profile.PUBLIC_TO_MM
            elif key in ('filled_out', 'email_optin',
                         'agreed_to_terms_of_service', 'verified_micromaster_user',):
                # booleans
                assert getattr(profile, key) is False
            elif key in ('image', 'image_small', 'image_medium',):
                assert not getattr(profile, key), "Image field should be empty"
            else:
                assert getattr(profile, key) is None

    def check_profile_fields(self, profile, profile_fields):
        """
        Helper function that asserts the values of a profile
        """
        profile.refresh_from_db()
        for key, val in profile_fields:
            assert getattr(profile, key) == val

    def setUp(self):
        """
        Set up class
        """
        super(EdxPipelineApiTest, self).setUp()
        self.user = UserFactory(username="user_1")
        self.user.social_auth.create(
            provider='not_edx',
        )
        self.user.social_auth.create(
            provider=edxorg.EdxOrgOAuth2.name,
            uid="{}_edx".format(self.user.username),
        )
        self.user_profile = Profile.objects.get(user=self.user)

        self.mocked_edx_profile = {
            'account_privacy': 'all_users',
            'bio': 'this is my personal profile text',
            'country': 'IT',
            'date_joined': '2016-03-17T20:37:51Z',
            'email': 'dummy.user@example.com',
            'gender': 'f',
            'goals': None,
            'is_active': True,
            'language_proficiencies': [{'code': 'it'}],
            'level_of_education': 'p',
            'mailing_address': None,
            'name': 'dummy user',
            'profile_image': {
                'has_image': True,
                'image_url_full': 'https://edx.org/full.jpg',
                'image_url_large': 'https://edx.org/large.jpg',
                'image_url_medium': 'https://edx.org/medium.jpg',
                'image_url_small': 'https://edx.org/small.jpg'
            },
            'requires_parental_consent': False,
            'username': get_social_username(self.user),
            'year_of_birth': 1986,
            "work_history": [
                {
                    "id": 1,
                    "city": "NY",
                    "state_or_territory": "NY",
                    "country": "USA",
                    "company_name": "XYZ-ABC",
                    "position": "SSE",
                    "industry": "IT",
                    "end_date": "2016-05-17T17:14:00Z",
                    "start_date": "2016-05-28T17:14:06Z"
                }
            ]
        }

    def test_update_profile_wrong_backend(self):
        """
        The only backend allowed for update_profile is edxorg
        """
        self.check_empty_profile(self.user_profile)

        backend = mock.MagicMock(name='other_backend')
        pipeline_api.update_profile_from_edx(
            backend, self.user, {'access_token': 'foo'}, True)

        self.user_profile.refresh_from_db()
        self.check_empty_profile(self.user_profile)

    def test_update_profile_old_user(self):
        """
        Only new users are updated
        """
        self.check_empty_profile(self.user_profile)
        pipeline_api.update_profile_from_edx(
            edxorg.EdxOrgOAuth2(strategy=mock.Mock()),
            self.user, {'access_token': 'foo'}, False, **{'edx_profile': self.mocked_edx_profile}
        )

        self.user_profile.refresh_from_db()
        self.check_empty_profile(self.user_profile)

    def test_update_profile_no_existing_profile(self):
        """
        The profile did not exist for the user
        """
        self.user_profile.delete()

        with self.assertRaises(Profile.DoesNotExist):
            Profile.objects.get(user=self.user)

        # just checking that nothing raises an exception
        pipeline_api.update_profile_from_edx(
            edxorg.EdxOrgOAuth2(strategy=mock.Mock()),
            self.user, {'access_token': 'foo_token'}, True, **{'edx_profile': self.mocked_edx_profile}
        )

        # verify that a profile has not been created
        with self.assertRaises(Profile.DoesNotExist):
            Profile.objects.get(user=self.user)

    def test_update_profile(self):
        """
        Happy path
        """
        mocked_content = self.mocked_edx_profile
        pipeline_api.update_profile_from_edx(
            edxorg.EdxOrgOAuth2(strategy=mock.Mock()),
            self.user, {'access_token': 'foo_token'}, True, **{'edx_profile': mocked_content}
        )

        first_name, last_name = split_name(mocked_content['name'])

        all_fields = [
            ('account_privacy', Profile.PUBLIC_TO_MM),
            ('edx_name', mocked_content['name']),
            ('first_name', first_name),
            ('last_name', last_name),
            ('preferred_name', mocked_content['name']),
            ('edx_bio', mocked_content['bio']),
            ('country', mocked_content['country']),
            ('edx_requires_parental_consent', mocked_content['requires_parental_consent']),
            ('edx_level_of_education', mocked_content['level_of_education']),
            ('edx_goals', mocked_content['goals']),
            ('edx_language_proficiencies', mocked_content['language_proficiencies']),
            ('preferred_language', mocked_content['language_proficiencies'][0]['code']),
            ('gender', mocked_content['gender']),
            ('edx_mailing_address', mocked_content['mailing_address']),
        ]

        self.check_profile_fields(self.user_profile, all_fields)

        # We do not set the date_of_birth using year_of_birth
        assert self.user_profile.date_of_birth is None

    @ddt.data(True, False)
    def test_update_email(self, is_new):
        """
        Test email changed for new user.
        """
        mocked_content = {
            'email': 'foo@example.com'
        }
        pipeline_api.update_profile_from_edx(
            edxorg.EdxOrgOAuth2(strategy=mock.Mock()),
            self.user, {'access_token': 'foo_token'}, is_new, **{'edx_profile': mocked_content}
        )

        assert self.user.email == mocked_content['email']

    def test_preferred_language(self):
        """
        If language_proficiencies is missing or invalid, we should not set
        preferred_language. We already test the success case in test_update_profile
        """
        for proficiencies in ([], {}, [{}], None):
            mocked_content = dict(self.mocked_edx_profile)
            mocked_content['language_proficiencies'] = proficiencies
            pipeline_api.update_profile_from_edx(
                edxorg.EdxOrgOAuth2(strategy=mock.Mock()),
                self.user, {'access_token': 'foo_token'}, True, **{'edx_profile': mocked_content}
            )

            self.user_profile.refresh_from_db()
            assert self.user_profile.preferred_language is None
            assert self.user_profile.edx_language_proficiencies == proficiencies

    @ddt.data(True, False)
    @mock.patch('backends.edxorg.EdxOrgOAuth2.get_json')
    def test_check_edx_verified_email(self, is_active, mocked_get_json):
        """
        User should be directed to error page if user is unverified on edX
        """
        mock_strategy = mock.Mock()
        backend = edxorg.EdxOrgOAuth2(strategy=mock_strategy)
        mocked_content = dict(self.mocked_edx_profile)
        mocked_content['is_active'] = is_active
        mocked_get_json.return_value = mocked_content
        result = pipeline_api.check_edx_verified_email(
            backend,
            {'access_token': 'foo_token'},
            {'username': get_social_username(self.user)}
        )

        mocked_get_json.assert_called_once_with(
            urljoin(
                edxorg.EdxOrgOAuth2.EDXORG_BASE_URL,
                '/api/user/v1/accounts/{0}'.format(get_social_username(self.user))
            ),
            headers={'Authorization': 'Bearer foo_token'}
        )
        if is_active:
            assert 'edx_profile' in result
        else:
            self.assertEqual(result.status_code, 302)

    def test_login_redirect_dashboard(self):
        """
        A student should be directed to /dashboard
        """
        student = UserFactory.create()
        mock_strategy = mock.Mock()
        mock_strategy.session.load.return_value = {}
        mock_strategy.session.get.return_value = {}
        backend = edxorg.EdxOrgOAuth2(strategy=mock_strategy)
        pipeline_api.update_profile_from_edx(backend, student, {}, False, **{'edx_profile': self.mocked_edx_profile})
        mock_strategy.session_set.assert_called_with('next', '/dashboard')

    def test_login_redirect_learners(self):
        """
        Staff or instructors should be directed to /learners
        """
        for role in [Staff.ROLE_ID, Instructor.ROLE_ID]:
            user = UserFactory.create()
            Role.objects.create(user=user, role=role, program=ProgramFactory.create())
            mock_strategy = mock.Mock()
            mock_strategy.session.load.return_value = {}
            mock_strategy.session.get.return_value = {}
            backend = edxorg.EdxOrgOAuth2(strategy=mock_strategy)
            pipeline_api.update_profile_from_edx(backend, user, {}, False, **{'edx_profile': self.mocked_edx_profile})
            mock_strategy.session_set.assert_called_with('next', '/learners')

    def test_login_redirect_next(self):
        """
        A student should be directed to what's in the next query parameter
        """
        student = UserFactory.create()
        next_url = "/x/y?a=bc"
        mock_strategy = mock.Mock()
        mock_strategy.session.load.return_value = {"next": next_url}
        mock_strategy.session.get.return_value = {}
        backend = edxorg.EdxOrgOAuth2(strategy=mock_strategy)
        pipeline_api.update_profile_from_edx(backend, student, {}, False, **{'edx_profile': self.mocked_edx_profile})
        mock_strategy.session_set.assert_called_with('next', next_url)

    def test_login_redirect_next_for_user_already_logged_in(self):
        """
        A student should be directed to what's in the next query parameter if user is already logged in to MM.
        """
        student = UserFactory.create()
        next_url = "/discussion"
        mock_strategy = mock.Mock()
        mock_strategy.session.load.return_value = {}
        mock_strategy.session.get.return_value = next_url
        backend = edxorg.EdxOrgOAuth2(strategy=mock_strategy)
        pipeline_api.update_profile_from_edx(backend, student, {}, False, **{'edx_profile': self.mocked_edx_profile})
        mock_strategy.session_set.assert_called_with('next', next_url)
