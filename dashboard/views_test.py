"""
Tests for the dashboard views
"""
from datetime import timedelta
from unittest.mock import (
    MagicMock,
    patch,
)

import ddt
from django.urls import reverse
from requests.exceptions import HTTPError
from rest_framework import status
from rest_framework.test import APITestCase
from edx_api.enrollments.models import Enrollments, Enrollment

from backends.utils import InvalidCredentialStored
from courses.factories import ProgramFactory, CourseRunFactory
from dashboard.factories import UserCacheRefreshTimeFactory, ProgramEnrollmentFactory
from dashboard.models import ProgramEnrollment, CachedEnrollment
from micromasters.exceptions import PossiblyImproperlyConfigured
from micromasters.factories import UserFactory, SocialUserFactory
from micromasters.utils import now_in_utc
from search.base import MockedESTestCase
from roles.models import Role
from roles.roles import (
    Instructor,
    Staff,
)


social_extra_data = {
    "access_token": "fooooootoken",
    "refresh_token": "baaaarrefresh",
}


@ddt.ddt
class DashboardTest(MockedESTestCase, APITestCase):
    """
    Tests for dashboard Rest API
    """

    @classmethod
    def setUpTestData(cls):
        super(DashboardTest, cls).setUpTestData()
        # create a user
        cls.user = SocialUserFactory.create()
        UserCacheRefreshTimeFactory(user=cls.user, unexpired=True)

        # create the programs
        cls.program_1 = ProgramFactory.create(live=True)
        cls.program_2 = ProgramFactory.create(live=True)
        cls.program_not_enrolled = ProgramFactory.create(live=True)
        cls.program_no_live = ProgramFactory.create(live=False)

        # enroll the user in some courses
        for program in [cls.program_1, cls.program_2, cls.program_no_live]:
            ProgramEnrollment.objects.create(
                user=cls.user,
                program=program
            )

        # url for the dashboard
        cls.url = reverse('dashboard_api', args=[cls.user.social_auth.first().uid])

    def setUp(self):
        super(DashboardTest, self).setUp()
        self.client.force_login(self.user)

    def test_anonym_access(self):
        """Test for GET"""
        self.client.logout()
        res = self.client.get(self.url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_get_dashboard(self):
        """Test for GET"""
        with patch('backends.utils.refresh_user_token', autospec=True):
            result = self.client.get(self.url)
        assert 'programs' in result.data
        assert 'is_edx_data_fresh' in result.data
        assert result.data['is_edx_data_fresh'] is True
        assert len(result.data['programs']) == 2
        assert {self.program_1.id, self.program_2.id} == {
            res_item['id'] for res_item in result.data['programs']
        }

    @ddt.data(Instructor, Staff)
    @patch('dashboard.api.CachedEdxDataApi.update_cache_if_expired')
    def test_edx_is_not_refreshed_if_not_own_dashboard(self, role, update_mock):
        """
        If the dashboard being queried is not the user's own dashboard
        the cached edx data should not be refreshed
        """
        staff = UserFactory.create()
        self.client.force_login(staff)
        Role.objects.create(
            user=staff,
            program=self.program_1,
            role=role.ROLE_ID,
        )
        self.client.get(self.url)
        assert update_mock.call_count == 0

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=MagicMock)
    @patch('backends.utils.refresh_user_token', autospec=True)
    @ddt.data(400, 401,)
    def test_http_error_propagated_from_back_functions(
            self, status_code, refr_token, refr_cache):  # pylint: disable=unused-argument
        """
        Tests that if an InvalidCredentialStored is raised from the backend,
        """
        refr_cache.side_effect = InvalidCredentialStored('foo message', status_code)
        result = self.client.get(self.url)
        assert result.status_code == status_code

    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_refresh_token_fails(self, refr_token):
        """
        Test if the refresh_user_token raises any other kind of exception
        """
        refr_token.side_effect = ZeroDivisionError
        result = self.client.get(self.url)
        assert result.status_code == status.HTTP_200_OK
        assert 'programs' in result.data
        assert 'is_edx_data_fresh' in result.data


class DashboardTokensTest(MockedESTestCase, APITestCase):
    """
    Tests for access tokens in dashboard Rest API
    """

    @classmethod
    def setUpTestData(cls):
        super(DashboardTokensTest, cls).setUpTestData()
        # create a user
        cls.user = SocialUserFactory.create(social_auth__extra_data=social_extra_data)
        cls.social_auth = cls.user.social_auth.first()
        cls.enrollments = Enrollments([])

        # url for the dashboard
        cls.url = reverse('dashboard_api', args=[cls.social_auth.uid])

    def setUp(self):
        super(DashboardTokensTest, self).setUp()
        self.client.force_login(self.user)
        self.now = now_in_utc()

    def update_social_extra_data(self, data):
        """Helper function to update the python social auth extra data"""
        self.social_auth.extra_data.update(data)
        self.social_auth.save()

    def get_with_mocked_enrollments(self):
        """Helper function to make requests with mocked enrollment endpoint"""
        with patch(
            'edx_api.enrollments.CourseEnrollments.get_student_enrollments',
            autospec=True,
            return_value=self.enrollments
        ):
            return self.client.get(self.url)

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_refresh_token(self, mock_refresh):
        """Test to verify that the access token is refreshed if it has expired"""
        extra_data = {
            "updated_at": (self.now - timedelta(weeks=1)).timestamp(),
            "expires_in": 100  # seconds
        }
        self.update_social_extra_data(extra_data)
        res = self.get_with_mocked_enrollments()
        assert mock_refresh.called
        assert res.status_code == status.HTTP_200_OK

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_refresh_token_still_valid(self, mock_refresh):
        """Test to verify that the access token is not refreshed if it has not expired"""
        extra_data = {
            "updated_at": (self.now - timedelta(minutes=1)).timestamp(),
            "expires_in": 31535999  # 1 year - 1 second
        }
        self.update_social_extra_data(extra_data)
        res = self.get_with_mocked_enrollments()
        assert not mock_refresh.called
        assert res.status_code == status.HTTP_200_OK

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', autospec=True)
    def test_refresh_token_error_server(self, mock_refresh):
        """Test to check what happens when the OAUTH server returns an invalid status code"""
        def raise_http_error(*args, **kwargs):  # pylint: disable=unused-argument
            """Mock function to raise an exception"""
            error = HTTPError()
            error.response = MagicMock()
            error.response.status_code = 400
            raise error

        mock_refresh.side_effect = raise_http_error
        extra_data = {
            "updated_at": (self.now - timedelta(weeks=1)).timestamp(),
            "expires_in": 100  # seconds
        }
        self.update_social_extra_data(extra_data)
        res = self.get_with_mocked_enrollments()
        assert mock_refresh.called
        assert res.status_code == status.HTTP_400_BAD_REQUEST


class UserCourseEnrollmentTest(MockedESTestCase, APITestCase):
    """
    Tests for the UserCourseEnrollment REST API
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # create a user
        cls.user = SocialUserFactory.create()

        # create the course run
        cls.course_id = "edx+fake+key"
        cls.course_run = CourseRunFactory.create(edx_course_key=cls.course_id)

        # url for the dashboard
        cls.url = reverse('user_course_enrollments')

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def test_methods_not_allowed(self):
        """
        Test that only POST is allowed
        """
        for method in ['put', 'patch', 'get', 'delete']:
            client = getattr(self.client, method)
            resp = client(self.url)
            assert resp.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_login_required(self):
        """
        Only logged in users can make requests
        """
        self.client.logout()
        resp = self.client.post(self.url, {}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_course_id_mandatory(self):
        """
        The request data must contain course_id
        """
        resp = self.client.post(self.url, {}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_refresh_token_fails(self, mock_refresh):
        """
        Test for when the server is unable to refresh the OAUTH token
        """
        mock_refresh.side_effect = InvalidCredentialStored('foo', status.HTTP_417_EXPECTATION_FAILED)
        resp = self.client.post(self.url, {'course_id': self.course_id}, format='json')
        assert resp.status_code == status.HTTP_417_EXPECTATION_FAILED
        assert mock_refresh.call_count == 1

    @patch('edx_api.enrollments.CourseEnrollments.create_audit_student_enrollment', autospec=True)
    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_enrollment_fails(self, mock_refresh, mock_edx_enr):  # pylint: disable=unused-argument
        """
        Test error when backend raises an exception
        """
        error = HTTPError()
        error.response = MagicMock()
        error.response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        mock_edx_enr.side_effect = error
        resp = self.client.post(self.url, {'course_id': self.course_id}, format='json')
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        # the response has a structure like {"error": "<message>"}
        assert isinstance(resp.data, dict)
        assert 'error' in resp.data
        assert mock_edx_enr.call_count == 1
        # assert just the second argument, since the first is `self`
        assert mock_edx_enr.call_args[0][1] == self.course_id

        # if instead edX returns a 400 error, an exception is raised by
        # the view and the user gets a different error message
        error.response.status_code = status.HTTP_400_BAD_REQUEST
        mock_edx_enr.side_effect = error
        resp = self.client.post(self.url, {'course_id': self.course_id}, format='json')
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert isinstance(resp.data, list)
        assert len(resp.data) == 1
        assert PossiblyImproperlyConfigured.__name__ in resp.data[0]

        # if the error from the call to edX is is not HTTPError, the user gets a normal json error
        mock_edx_enr.side_effect = ValueError()
        resp = self.client.post(self.url, {'course_id': self.course_id}, format='json')
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        # the response has a structure like {"error": "<message>"}
        assert isinstance(resp.data, dict)
        assert 'error' in resp.data

    @patch('search.tasks.index_users', autospec=True)
    @patch('edx_api.enrollments.CourseEnrollments.create_audit_student_enrollment', autospec=True)
    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_enrollment(self, mock_refresh, mock_edx_enr, mock_index):  # pylint: disable=unused-argument
        """
        Test for happy path
        """
        cache_enr = CachedEnrollment.objects.filter(
            user=self.user, course_run__edx_course_key=self.course_id).first()
        assert cache_enr is None

        enr_json = {'course_details': {'course_id': self.course_id}}
        enrollment = Enrollment(enr_json)
        mock_edx_enr.return_value = enrollment
        resp = self.client.post(self.url, {'course_id': self.course_id}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert mock_edx_enr.call_count == 1
        assert mock_edx_enr.call_args[0][1] == self.course_id
        assert resp.data == enr_json
        mock_index.delay.assert_called_once_with([self.user.id], check_if_changed=True)

        cache_enr = CachedEnrollment.objects.filter(
            user=self.user, course_run__edx_course_key=self.course_id).first()
        assert cache_enr is not None


class UnEnrollProgramsTest(MockedESTestCase, APITestCase):
    """
    Tests for UnEnrollPrograms Rest API
    """
    @classmethod
    def setUpTestData(cls):
        cls.user = SocialUserFactory.create(social_auth__extra_data=social_extra_data)
        cls.invalid_user = UserFactory.create()
        cls.url = reverse('unenroll_programs')

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)
        self.program_enrollments = [ProgramEnrollmentFactory.create(user=self.user) for _ in range(2)]

    def test_unenroll_all_programs(self):
        """test for api multiple program unenroll"""
        program_ids = [self.program_enrollments[0].program_id, self.program_enrollments[1].program_id]
        assert ProgramEnrollment.objects.filter(
            user=self.user
        ).count() == len(self.program_enrollments)

        resp = self.client.post(
            self.url, {
                "program_ids": program_ids
            },
            format='json'
        )

        # test no enrollment left
        assert resp.status_code == status.HTTP_200_OK
        assert ProgramEnrollment.objects.filter(
            program_id__in=program_ids,
            user=self.user
        ).count() == 0

    def test_unenroll_single_programs(self):
        """test for api single program unenroll"""
        program_ids = [self.program_enrollments[0].program_id]
        assert ProgramEnrollment.objects.filter(
            user=self.user
        ).count() == len(self.program_enrollments)

        resp = self.client.post(
            self.url, {
                "program_ids": program_ids
            },
            format='json'
        )

        assert resp.status_code == status.HTTP_200_OK
        # test correct enrollments left
        program_enrollment_list = ProgramEnrollment.objects.filter(
            user=self.user
        )
        assert program_enrollment_list.count() == 1
        assert program_enrollment_list[0].program_id != program_ids[0]
        assert program_enrollment_list[0].program_id == self.program_enrollments[1].program_id

    def test_unenroll_single_invalid_programs(self):
        """test for api single invalid program unenroll"""
        program_ids = [self.program_enrollments[0].program_id + self.program_enrollments[1].program_id]
        assert ProgramEnrollment.objects.filter(
            user=self.user
        ).count() == len(self.program_enrollments)

        resp = self.client.post(
            self.url, {
                "program_ids": program_ids
            },
            format='json'
        )

        assert resp.status_code == status.HTTP_200_OK
        # test no change in enrollments
        program_enrollment_list = ProgramEnrollment.objects.filter(
            user=self.user
        )
        assert program_enrollment_list.count() == len(self.program_enrollments)

    def test_unenroll_mix_valid_invalid_programs(self):
        """test api for mix valid and invalid program list"""
        program_ids = [
            self.program_enrollments[0].program_id + self.program_enrollments[1].program_id,
            self.program_enrollments[0].program_id
        ]
        assert ProgramEnrollment.objects.filter(
            user=self.user
        ).count() == len(self.program_enrollments)

        resp = self.client.post(
            self.url, {
                "program_ids": program_ids
            },
            format='json'
        )

        assert resp.status_code == status.HTTP_200_OK
        # test only one valid program is unenroll
        program_enrollment_list = ProgramEnrollment.objects.filter(
            user=self.user
        )
        assert program_enrollment_list.count() == 1

    def test_unenroll_when_other_user_access_api(self):
        """test for api single program unenroll"""
        self.client.force_login(self.invalid_user)
        program_ids = [self.program_enrollments[0].program_id]
        assert ProgramEnrollment.objects.filter(
            user=self.invalid_user
        ).count() == 0

        resp = self.client.post(
            self.url, {
                "program_ids": program_ids
            },
            format='json'
        )

        assert resp.status_code == status.HTTP_200_OK

        # test no effect on irrelevant user
        assert ProgramEnrollment.objects.filter(
            user=self.invalid_user
        ).count() == 0
