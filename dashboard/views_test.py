"""
Tests for the dashboard views
"""
from datetime import datetime, timedelta
from mock import (
    MagicMock,
    patch,
)

import pytz
from django.core.urlresolvers import reverse
from requests.exceptions import HTTPError
from rest_framework import status
from rest_framework.test import APITestCase
from edx_api.certificates.models import Certificates
from edx_api.enrollments.models import Enrollments, Enrollment
from edx_api.grades.models import CurrentGrades

from backends.edxorg import EdxOrgOAuth2
from backends.utils import InvalidCredentialStored
from courses.factories import ProgramFactory, CourseRunFactory
from dashboard.models import ProgramEnrollment, CachedEnrollment
from dashboard.utils import MMTrack
from profiles.factories import UserFactory
from search.base import ESTestCase


class DashboardTest(APITestCase):
    """
    Tests for dashboard Rest API
    """

    @classmethod
    def setUpTestData(cls):
        super(DashboardTest, cls).setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        # create a social auth for the user
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.user.username),
            extra_data='{"access_token": "fooooootoken"}'
        )

        # create the programs
        cls.program_1 = ProgramFactory.create(live=True)
        cls.program_2 = ProgramFactory.create(live=True)
        cls.program_3 = ProgramFactory.create(live=True)
        cls.program_no_live = ProgramFactory.create(live=False)

        # enroll the user in some courses
        for program in [cls.program_1, cls.program_3, cls.program_no_live]:
            ProgramEnrollment.objects.create(
                user=cls.user,
                program=program
            )

        # url for the dashboard
        cls.url = reverse('dashboard_api')

    def setUp(self):
        super(DashboardTest, self).setUp()
        self.client.force_login(self.user)

    # pylint: disable=no-value-for-parameter
    @patch('backends.utils.refresh_user_token', autospec=True)
    @patch('dashboard.views.get_student_certificates', autospec=True, return_value=Certificates([]))
    @patch('dashboard.views.get_student_enrollments', autospec=True, return_value=Enrollments([]))
    @patch('dashboard.views.get_student_current_grades', autospec=True, return_value=CurrentGrades([]))
    def get_with_mocked_refresh_backends(self, mock_grades, mock_enr, mock_cert, mock_tok):
        """Helper function to perform get request with mocked backend functions"""
        def mocked_info_program(mmtrack):
            """Mocked function for getting info for the program"""
            assert isinstance(mmtrack, MMTrack)
            return {'program': mmtrack.program.title, 'id': mmtrack.program.id}

        with patch('dashboard.views.get_info_for_program', autospec=True, side_effect=mocked_info_program):
            resp = self.client.get(self.url)

        assert mock_grades.call_count == 1
        assert mock_enr.call_count == 1
        assert mock_cert.call_count == 1
        assert mock_tok.call_count == 1

        return resp

    def test_anonym_access(self):
        """Test for GET"""
        self.client.logout()
        res = self.client.get(self.url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_get_dashboard(self):
        """Test for GET"""
        res = self.get_with_mocked_refresh_backends()

        assert res.status_code == status.HTTP_200_OK
        data = res.data
        assert len(data) == 3
        program_ids = [data[0]['id'], data[1]['id'], data[2]['id'], ]
        assert self.program_1.pk in program_ids
        assert self.program_3.pk in program_ids
        assert self.program_2.pk in program_ids
        assert self.program_no_live.pk not in program_ids


class DashboardTokensTest(APITestCase):
    """
    Tests for access tokens in dashboard Rest API
    """

    @classmethod
    def setUpTestData(cls):
        super(DashboardTokensTest, cls).setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        # create a social auth for the user
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.user.username),
            extra_data='{"access_token": "fooooootoken", "refresh_token": "baaaarrefresh"}'
        )

        cls.enrollments = Enrollments([])

        # url for the dashboard
        cls.url = reverse('dashboard_api')

    def setUp(self):
        super(DashboardTokensTest, self).setUp()
        self.client.force_login(self.user)
        self.now = datetime.now(pytz.utc)

    def update_social_extra_data(self, data):
        """Helper function to update the python social auth extra data"""
        social_user = self.user.social_auth.get(provider=EdxOrgOAuth2.name)
        social_user.extra_data.update(data)
        social_user.save()

    def get_with_mocked_enrollments(self):
        """Helper function to make requests with mocked enrollment endpoint"""
        with patch(
            'edx_api.enrollments.CourseEnrollments.get_student_enrollments',
            autospec=True,
            return_value=self.enrollments
        ):
            return self.client.get(self.url)

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', autospec=True)
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

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', autospec=True)
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


class UserCourseEnrollmentTest(ESTestCase, APITestCase):
    """
    Tests for the UserCourseEnrollment REST API
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        # create a social auth for the user
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.user.username),
            extra_data='{"access_token": "fooooootoken"}'
        )

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
        mock_edx_enr.side_effect = HTTPError()
        resp = self.client.post(self.url, {'course_id': self.course_id}, format='json')
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert mock_edx_enr.call_count == 1
        # assert just the second argument, since the first is `self`
        assert mock_edx_enr.call_args[0][1] == self.course_id

    @patch('edx_api.enrollments.CourseEnrollments.create_audit_student_enrollment', autospec=True)
    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_enrollment(self, mock_refresh, mock_edx_enr):  # pylint: disable=unused-argument
        """
        Test for happy path
        """
        cache_enr = CachedEnrollment.objects.filter(
            user=self.user, course_run__edx_course_key=self.course_id).exclude(data=None).first()
        assert cache_enr is None

        enr_json = {'course_details': {'course_id': self.course_id}}
        enrollment = Enrollment(enr_json)
        mock_edx_enr.return_value = enrollment
        resp = self.client.post(self.url, {'course_id': self.course_id}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert mock_edx_enr.call_count == 1
        assert mock_edx_enr.call_args[0][1] == self.course_id
        assert resp.data == enr_json

        cache_enr = CachedEnrollment.objects.filter(
            user=self.user, course_run__edx_course_key=self.course_id).exclude(data=None).first()
        assert cache_enr is not None
