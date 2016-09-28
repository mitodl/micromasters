"""
Tests for HTTP email API views
"""
from unittest.mock import Mock, patch
from django.core.urlresolvers import reverse
from django.db.models.signals import post_save
from rest_framework.test import APITestCase
from rest_framework.response import Response
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
)
from factory.django import mute_signals

from profiles.factories import ProfileFactory
from courses.factories import ProgramFactory
from roles.models import Role
from roles.roles import Staff


def mocked_json(return_data=None):
    """Mocked version of the json method for the Response class"""
    if return_data is None:
        return_data = {}

    def json(*args, **kwargs):  # pylint:disable=unused-argument, missing-docstring
        return return_data
    return json


@patch('mail.views.prepare_and_execute_search')  # pylint: disable=missing-docstring
@patch('mail.views.MailgunClient')  # pylint: disable=missing-docstring
class MailViewsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.search_result_mail_url = reverse('search_result_mail_api')
        cls.program = ProgramFactory.create(live=True)
        # create a user with a role for one program
        with mute_signals(post_save):
            staff_profile = ProfileFactory.create()
            cls.staff = staff_profile.user
        Role.objects.create(
            user=cls.staff,
            program=cls.program,
            role=Staff.ROLE_ID
        )
        cls.request_data = {
            'search_request': {},
            'email_subject': 'email subject',
            'email_body': 'email body'
        }

    def setUp(self):
        super(MailViewsTests, self).setUp()
        self.client.force_login(self.staff)

    def test_send_view(self, mock_mailgun_client, mock_prepare_exec_search):
        """
        Test that the SearchResultMailView will accept and return expected values
        """
        email_results = ['a@example.com', 'b@example.com']
        mock_prepare_exec_search.return_value = email_results
        mock_mailgun_client.send_batch.return_value = [
            Mock(spec=Response, status_code=HTTP_200_OK, json=mocked_json())
        ]
        resp_post = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp_post.status_code == HTTP_200_OK
        assert mock_prepare_exec_search.called
        assert mock_mailgun_client.send_batch.called
        _, called_kwargs = mock_mailgun_client.send_batch.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        assert called_kwargs['body'] == self.request_data['email_body']
        assert called_kwargs['recipients'] == email_results

    def test_view_response(self, mock_mailgun_client, mock_prepare_exec_search):
        """
        Test the structure of the response returned by the SearchResultMailView
        """
        email_results = ['a@example.com', 'b@example.com']
        mock_prepare_exec_search.return_value = email_results
        mock_mailgun_client.send_batch.return_value = [
            Mock(spec=Response, status_code=HTTP_200_OK, json=mocked_json()),
            Mock(spec=Response, status_code=HTTP_400_BAD_REQUEST, json=mocked_json()),
        ]
        resp_post = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp_post.status_code == HTTP_200_OK
        assert len(resp_post.data.keys()) == 2
        for num in range(2):
            batch = 'batch_{0}'.format(num)
            assert batch in resp_post.data
            assert 'status_code' in resp_post.data[batch]
            assert 'data' in resp_post.data[batch]
        assert resp_post.data['batch_0']['status_code'] == HTTP_200_OK
        assert resp_post.data['batch_1']['status_code'] == HTTP_400_BAD_REQUEST

    def test_no_program_user_response(self, *args):  # pylint: disable=unused-argument
        """
        Test that a 403 will be returned when a user with inadequate permissions attempts
        to send an email through the SearchResultMailView
        """
        with mute_signals(post_save):
            no_permissions_profile = ProfileFactory.create()
        self.client.force_login(no_permissions_profile.user)
        resp_post = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp_post.status_code == HTTP_403_FORBIDDEN


@patch('mail.views.MailgunClient')
class FinancialAidMailViewsTests(APITestCase):
    """
    Tests for FinancialAidMailViews
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.financial_aid_mail_url = reverse('financial_aid_mail_api')
        # create a user with a role for one program
        with mute_signals(post_save):
            staff_profile = ProfileFactory.create()
            cls.staff = staff_profile.user
        cls.program = ProgramFactory.create(live=True)
        Role.objects.create(
            user=cls.staff,
            program=cls.program,
            role=Staff.ROLE_ID
        )
        cls.request_data = {
            'email_subject': 'email subject',
            'email_body': 'email body',
            'email_recipient': 'a@example.com'
        }

    def test_send_financial_aid_view(self, mock_mailgun_client):
        """
        Test that the FinancialAidMailView will accept and return expected values
        """
        self.client.force_login(self.staff)
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=HTTP_200_OK,
            json=mocked_json()
        )
        resp_post = self.client.post(
            self.financial_aid_mail_url,
            data=self.request_data,
            format='json'
        )
        assert resp_post.status_code == HTTP_200_OK
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        assert called_kwargs['body'] == self.request_data['email_body']
        assert called_kwargs['recipient'] == 'a@example.com'
