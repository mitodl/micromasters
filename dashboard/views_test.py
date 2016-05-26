"""
Tests for the dashboard views
"""
import json
import os
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
from edx_api.enrollments.models import Enrollments

from backends.edxorg import EdxOrgOAuth2
from courses.factories import (
    ProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from dashboard.api import CourseStatus
from profiles.factories import UserFactory


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

        # create an enrollments object
        with open(os.path.join(os.path.dirname(__file__),
                               'fixtures/user_enrollments.json')) as file_obj:
            cls.enrollments_json = json.loads(file_obj.read())
        cls.enrollments = Enrollments(cls.enrollments_json)

        # create the programs
        cls.program_1 = ProgramFactory.create(live=True)
        cls.program_2 = ProgramFactory.create(live=True)
        cls.program_no_live = ProgramFactory.create(live=False)

        # create some courses for each program
        cls.courses_1 = []
        cls.courses_2 = []
        for num in range(2):
            cls.courses_1.append(
                CourseFactory.create(
                    title="title course prog1 {}".format(num),
                    program=cls.program_1
                )
            )
            cls.courses_2.append(
                CourseFactory.create(
                    title="title course prog2 {}".format(num),
                    program=cls.program_2
                )
            )

        # url for the dashboard
        cls.url = reverse('dashboard_api')

    def setUp(self):
        super(DashboardTest, self).setUp()
        self.client.force_login(self.user)
        self.now = datetime.now(pytz.utc)

    def create_run(self, course=None, start=None, end=None, enr_start=None, enr_end=None, edx_key=None):
        """helper function to create course runs"""
        # pylint: disable=too-many-arguments
        run = CourseRunFactory.create(
            course=course or self.course,
            title="Title Run",
            start_date=start,
            end_date=end,
            enrollment_start=enr_start,
            enrollment_end=enr_end,
        )
        if edx_key is not None:
            run.edx_course_key = edx_key
            run.save()
        return run

    def get_with_mocked_enrollment(self):
        """Helper function to permorm get request with mocked enrollments"""
        with patch(
            'edx_api.enrollments.CourseEnrollments.get_student_enrollments',
            autospec=True,
            return_value=self.enrollments
        ):
            return self.client.get(self.url)

    def test_anonym_access(self):
        """Test for GET"""
        self.client.logout()
        res = self.client.get(self.url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_programs(self, mocked_refresh):
        """Test for GET"""
        res = self.get_with_mocked_enrollment()
        assert mocked_refresh.called
        assert res.status_code == status.HTTP_200_OK
        data = res.data
        assert len(data) == 2
        program_ids = [data[0]['id'], data[1]['id'], ]
        assert self.program_1.pk in program_ids
        assert self.program_2.pk in program_ids
        assert self.program_no_live.pk not in program_ids

    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_no_run_available(self, mocked_refresh):
        """Test for GET"""
        res = self.get_with_mocked_enrollment()
        assert mocked_refresh.called
        assert res.status_code == status.HTTP_200_OK
        data = res.data
        assert len(data) == 2
        for program in data:
            assert 'courses' in program
            assert len(program['courses']) == 2
            for course in program['courses']:
                assert course['status'] == CourseStatus.NOT_OFFERED

    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_with_runs(self, mocked_refresh):
        """Test for GET"""
        # create some runs
        self.create_run(
            course=self.courses_1[0],
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        self.create_run(
            course=self.courses_1[1],
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        res = self.get_with_mocked_enrollment()
        assert mocked_refresh.called
        assert res.status_code == status.HTTP_200_OK
        data = res.data
        assert len(data) == 2
        for program in data:
            assert 'courses' in program
            assert len(program['courses']) == 2
            for course_data in program['courses']:
                assert 'status' in course_data
                assert 'runs' in course_data
                if len(course_data['runs']) == 1:
                    assert 'course_id' in course_data['runs'][0]
                    if course_data['runs'][0]['course_id'] == "course-v1:edX+DemoX+Demo_Course":
                        assert course_data['runs'][0]['status'] == CourseStatus.CURRENT_GRADE
                    if course_data['runs'][0]['course_id'] == "course-v1:MITx+8.MechCX+2014_T1":
                        assert course_data['runs'][0]['status'] == CourseStatus.UPGRADE


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
