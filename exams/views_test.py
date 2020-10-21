"""
Tests for exam views
"""
from unittest.mock import patch

import ddt
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse

from exams.models import ExamProfile
from micromasters.factories import UserFactory
from micromasters.test import SimpleTestCase
from micromasters.utils import now_in_utc
from search.base import MockedESTestCase


class PearsonSSOCallbackTests(SimpleTestCase):
    """
    Tests for Pearson callback URLs
    """
    databases = '__all__'

    def test_success(self):
        """
        Test /pearson/success URL
        """
        response = self.client.get('/pearson/success/')
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == "/dashboard?exam=success"

    def test_error(self):
        """
        Test /pearson/error URL
        """
        response = self.client.get('/pearson/error/')
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == "/dashboard?exam=error"

    def test_timeout(self):
        """
        Test /pearson/error URL
        """
        response = self.client.get('/pearson/timeout/')
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == "/dashboard?exam=timeout"

    def test_logout(self):
        """
        Test /pearson/logout URL
        """
        response = self.client.get('/pearson/logout/')
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == "/dashboard?exam=logout"

    def test_not_found(self):
        """
        Test a URL under /pearson that doesn't exist
        """
        response = self.client.get('/pearson/other/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@ddt.ddt
class PearsonSSOViewTests(MockedESTestCase, APITestCase):
    """
    Tests for the SSO views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # create an user
        cls.user = UserFactory()

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    def test_sso_get_no_exam_profile(self):
        """
        Test issuing a GET request when user has no ExamProfile
        """
        with patch('exams.views.sso_digest', return_value='test value'):
            response = self.client.get(reverse("pearson_sso_api"))
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json() == {
                'error': 'You are not ready to schedule an exam at this time',
            }

    @ddt.data(
        (ExamProfile.PROFILE_INVALID, ),
        (ExamProfile.PROFILE_IN_PROGRESS, ),
        (ExamProfile.PROFILE_PENDING, ),
    )
    @ddt.unpack
    def test_sso_get_with_exam_profile_not_success(self, profile_status):
        """
        Test issuing a GET request when user has an ExamProfile in non-success status
        """
        ExamProfile.objects.create(
            profile=self.user.profile,
            status=profile_status,
        )

        with patch('exams.views.sso_digest', return_value='test value'):
            response = self.client.get(reverse("pearson_sso_api"))
            assert response.status_code == status.HTTP_403_FORBIDDEN
            assert response.json() == {
                'error': 'You are not ready to schedule an exam at this time',
            }

    def test_sso_get_with_exam_profile_success(self):
        """
        Test issuing a GET request when user has an ExamProfile in PROFILE_SUCCESS status
        """
        ExamProfile.objects.create(
            profile=self.user.profile,
            status=ExamProfile.PROFILE_SUCCESS,
        )

        with patch('exams.views.sso_digest', return_value='test value'):
            response = self.client.get(reverse("pearson_sso_api"))
            result = response.json()
            assert response.status_code == status.HTTP_200_OK

            timestamp = result['timestamp']
            assert isinstance(timestamp, int)

            now = int(now_in_utc().timestamp())
            assert now - timestamp < 5

            assert result['sso_digest'] == 'test value'

            # best we can assert is that this is an integer
            assert isinstance(result['session_timeout'], int)

            assert result['sso_redirect_url'] == 'http://testserver/'

    def test_sso_improperly_configured_response(self):
        """
        Test issuing a GET request when user has an ExamProfile in PROFILE_SUCCESS status
        """
        ExamProfile.objects.create(
            profile=self.user.profile,
            status=ExamProfile.PROFILE_SUCCESS,
        )

        with patch('exams.views.sso_digest', side_effect=ImproperlyConfigured):
            response = self.client.get(reverse("pearson_sso_api"))
            assert response.status_code == 500
