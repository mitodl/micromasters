"""
Tests for HTTP email API views
"""
from unittest.mock import Mock, patch

from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from django.db.models.signals import post_save
from requests.exceptions import HTTPError
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.response import Response
from factory.django import mute_signals

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from dashboard.factories import ProgramEnrollmentFactory, CachedEnrollmentFactory
from dashboard.models import ProgramEnrollment
from financialaid.api_test import (
    FinancialAidBaseTestCase,
    create_program,
    create_enrolled_profile,
)
from financialaid.factories import FinancialAidFactory, TierProgramFactory
from mail.exceptions import SendBatchException
from mail.models import AutomaticEmail
from profiles.factories import ProfileFactory
from profiles.util import full_name
from roles.models import Role
from roles.roles import Staff
from search.api import create_search_obj
from search.base import MockedESTestCase


def mocked_json(return_data=None):
    """Mocked version of the json method for the Response class"""
    if return_data is None:
        return_data = {}

    def json(*args, **kwargs):  # pylint:disable=unused-argument, missing-docstring
        return return_data
    return json


class SearchResultMailViewsTests(MockedESTestCase, APITestCase):
    """
    Tests for the mail API
    """
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

    def setUp(self):
        super().setUp()
        self.client.force_login(self.staff)
        self.request_data = {
            'search_request': {},
            'email_subject': 'email subject',
            'email_body': 'email body'
        }

    def test_send_view(self):
        """
        Test that the SearchResultMailView will accept and return expected values
        """
        email_results = ['a@example.com', 'b@example.com']
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=email_results
        ) as mock_get_emails, patch('mail.views.MailgunClient') as mock_mailgun_client:
            mock_mailgun_client.send_batch.return_value = [Response()]
            resp_post = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK
        assert mock_get_emails.called
        assert mock_get_emails.call_args[0][0].to_dict() == create_search_obj(
            user=self.staff,
            search_param_dict=self.request_data['search_request'],
            filter_on_email_optin=True,
        ).to_dict()

        assert mock_mailgun_client.send_batch.called
        _, called_kwargs = mock_mailgun_client.send_batch.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        assert called_kwargs['body'] == self.request_data['email_body']
        assert called_kwargs['recipients'] == email_results

    def test_view_response_error(self):
        """
        If there's at least one non-zero status code from Mailgun, we should return a 500 status code in our response.
        """
        email_results = ['a@example.com', 'b@example.com']
        exception_pairs = [
            ['b@example.com'], HTTPError()
        ]
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=email_results
        ), patch('mail.views.MailgunClient') as mock_mailgun_client:
            mock_mailgun_client.send_batch.side_effect = SendBatchException(exception_pairs)
            with self.assertRaises(SendBatchException) as send_batch_exception:
                self.client.post(self.search_result_mail_url, data=self.request_data, format='json')

        assert send_batch_exception.exception.exception_pairs == exception_pairs

    def test_view_response_improperly_configured(self):
        """
        Test that the SearchResultMailView will raise ImproperlyConfigured if mailgun returns 401, which
        results in returning 500 since micromasters.utils.custom_exception_handler catches ImproperlyConfigured
        """
        email_results = ['a@example.com', 'b@example.com']
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=email_results
        ), patch('mail.views.MailgunClient') as mock_mailgun_client:
            mock_mailgun_client.send_batch.side_effect = ImproperlyConfigured
            resp = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_no_program_user_response(self):
        """
        Test that a 403 will be returned when a user with inadequate permissions attempts
        to send an email through the SearchResultMailView
        """
        with mute_signals(post_save):
            no_permissions_profile = ProfileFactory.create()
        self.client.force_login(no_permissions_profile.user)
        resp_post = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_403_FORBIDDEN

    def test_automatic_email(self):
        """
        If send_automatic_emails is set to true, we should save the information in the AutomaticEmail model
        """
        email_results = ['a@example.com', 'b@example.com']
        request_data = self.request_data.copy()
        request_data['send_automatic_emails'] = True

        assert AutomaticEmail.objects.count() == 0
        search_dict = create_search_obj(
            user=self.staff,
            search_param_dict=request_data['search_request'],
            filter_on_email_optin=True,
        ).to_dict()
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=email_results
        ) as mock_get_emails, patch(
            'mail.views.MailgunClient'
        ) as mock_mailgun_client, patch(
            'search.signals.index_percolate_queries.delay', autospec=True
        ) as mocked_index_percolate_queries:
            mock_mailgun_client.send_batch.return_value = Response()
            resp_post = self.client.post(self.search_result_mail_url, data=request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK
        assert mock_get_emails.called
        assert mock_get_emails.call_args[0][0].to_dict() == search_dict

        assert mock_mailgun_client.send_batch.called
        _, called_kwargs = mock_mailgun_client.send_batch.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        assert called_kwargs['body'] == self.request_data['email_body']
        assert called_kwargs['recipients'] == email_results

        assert AutomaticEmail.objects.count() == 1
        automatic_email = AutomaticEmail.objects.first()
        percolate_query = automatic_email.query
        mocked_index_percolate_queries.assert_called_with([percolate_query.id])
        assert percolate_query.query == search_dict
        assert automatic_email.email_subject == self.request_data['email_subject']
        assert automatic_email.email_body == self.request_data['email_body']
        assert automatic_email.sender_name == full_name(self.staff)
        assert automatic_email.enabled is True


class CourseTeamMailViewTests(APITestCase, MockedESTestCase):
    """
    Tests for CourseTeamMailView
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        with mute_signals(post_save):
            staff_profile = ProfileFactory.create()
        cls.staff_user = staff_profile.user
        cls.course = CourseFactory.create(
            contact_email='a@example.com',
            program__financial_aid_availability=False
        )
        course_run = CourseRunFactory.create(course=cls.course)
        ProgramEnrollmentFactory.create(user=cls.staff_user, program=cls.course.program)
        CachedEnrollmentFactory.create(user=cls.staff_user, course_run=course_run)
        cls.url_name = 'course_team_mail_api'
        cls.request_data = {
            'email_subject': 'email subject',
            'email_body': 'email body'
        }

    @patch('mail.views.MailgunClient')
    def test_send_course_team_email_view(self, mock_mailgun_client):
        """
        Test that course team emails are correctly sent through the view
        """
        self.client.force_login(self.staff_user)
        mock_mailgun_client.send_course_team_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        url = reverse(self.url_name, kwargs={'course_id': self.course.id})
        resp_post = self.client.post(url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK
        assert mock_mailgun_client.send_course_team_email.called
        _, called_kwargs = mock_mailgun_client.send_course_team_email.call_args
        assert called_kwargs['user'] == self.staff_user
        assert called_kwargs['course'] == self.course
        assert called_kwargs['subject'] == self.request_data['email_subject']
        assert called_kwargs['body'] == self.request_data['email_body']
        assert 'raise_for_status' not in called_kwargs

    def test_course_team_email_with_no_enrollment(self):
        """
        Test that an attempt to send an email to a course in an un-enrolled program will fail
        """
        self.client.force_login(self.staff_user)
        new_course = CourseFactory.create(contact_email='b@example.com')
        url = reverse(self.url_name, kwargs={'course_id': new_course.id})
        resp = self.client.post(url, data=self.request_data, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_course_team_email_unpaid(self):
        """
        Test that an attempt to send an email to the course team of an unpaid course will fail
        """
        self.client.force_login(self.staff_user)
        new_course = CourseFactory.create(contact_email='c@example.com')
        ProgramEnrollmentFactory.create(user=self.staff_user, program=new_course.program)
        url = reverse(self.url_name, kwargs={'course_id': new_course.id})
        resp = self.client.post(url, data=self.request_data, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN


class LearnerMailViewTests(APITestCase, MockedESTestCase):
    """
    Tests for LearnerMailView
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        with mute_signals(post_save):
            staff_profile = ProfileFactory.create(user__email='sender@example.com')
            recipient_profile = ProfileFactory.create(user__email='recipient@example.com', student_id=123)
        cls.staff_user = staff_profile.user
        cls.recipient_user = recipient_profile.user
        cls.program = ProgramFactory.create()
        ProgramEnrollmentFactory.create(
            user=cls.recipient_user,
            program=cls.program
        )
        Role.objects.create(
            user=cls.staff_user,
            program=cls.program,
            role=Staff.ROLE_ID
        )
        cls.url_name = 'learner_mail_api'
        cls.request_data = {
            'email_subject': 'email subject',
            'email_body': 'email body'
        }

    @patch('mail.views.MailgunClient')
    def test_send_learner_email_view(self, mock_mailgun_client):
        """
        Test that learner emails are correctly sent through the view
        """
        self.client.force_login(self.staff_user)
        mock_mailgun_client.send_individual_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        url = reverse(self.url_name, kwargs={'student_id': self.recipient_user.profile.student_id})
        resp_post = self.client.post(url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK
        assert mock_mailgun_client.send_individual_email.called
        _, called_kwargs = mock_mailgun_client.send_individual_email.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        assert called_kwargs['body'] == self.request_data['email_body']
        assert called_kwargs['recipient'] == self.recipient_user.email
        assert called_kwargs['sender_address'] == self.staff_user.email
        assert called_kwargs['sender_name'] == self.staff_user.profile.display_name
        assert 'raise_for_status' not in called_kwargs

    @patch('mail.views.MailgunClient')
    def test_send_learner_email_view_error(self, mock_mailgun_client):
        """
        Test that exceptions from send_individual_email are passed through the view
        """
        self.client.force_login(self.staff_user)
        mock_mailgun_client.send_individual_email.side_effect = HTTPError()
        url = reverse(self.url_name, kwargs={'student_id': self.recipient_user.profile.student_id})
        with self.assertRaises(HTTPError):
            self.client.post(url, data=self.request_data, format='json')

    def test_learner_view_invalid_student_id(self):
        """
        Test that a non-existent student_id will result in a 404 in the learner email view
        """
        self.client.force_login(self.staff_user)
        url = reverse(self.url_name, kwargs={'student_id': 0})
        resp_post = self.client.post(url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_404_NOT_FOUND

    def test_learner_view_missing_data(self):
        """
        Test that a request to the learner email view without required data in the body will
        result in an error
        """
        self.client.force_login(self.staff_user)
        url = reverse(self.url_name, kwargs={'student_id': self.recipient_user.profile.student_id})
        resp_post = self.client.post(url, data={}, format='json')
        assert resp_post.status_code == status.HTTP_400_BAD_REQUEST

    def test_learner_view_not_program_staff(self):
        """
        Test that an attempt to email a recipient by a sender that doesn't have staff permission in any
        of the recipient's enrolled programs will result in an error
        """
        self.client.force_login(self.staff_user)
        # Get rid of existing recipient program enrollment that staff_user has a Staff role in
        ProgramEnrollment.objects.filter(user=self.recipient_user).delete()
        url = reverse(self.url_name, kwargs={'student_id': self.recipient_user.profile.student_id})
        resp_post = self.client.post(url, data={}, format='json')
        assert resp_post.status_code == status.HTTP_403_FORBIDDEN


class FinancialAidMailViewTests(FinancialAidBaseTestCase, APITestCase):
    """
    Tests for FinancialAidMailView
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.financial_aid = FinancialAidFactory.create(
            tier_program=TierProgramFactory.create(program=cls.program)
        )
        cls.url = reverse(
            'financial_aid_mail_api',
            kwargs={'financial_aid_id': cls.financial_aid.id}
        )
        cls.request_data = {
            'email_subject': 'email subject',
            'email_body': 'email body'
        }

    def test_different_programs_staff(self):
        """Different program's staff should not be allowed to send email for this program"""
        program, _ = create_program()
        staff_user = create_enrolled_profile(program, Staff.ROLE_ID).user
        self.client.force_login(staff_user)
        self.make_http_request(self.client.post, self.url, status.HTTP_403_FORBIDDEN, data=self.request_data)

    def test_instructor(self):
        """An instructor can't send email"""
        self.client.force_login(self.instructor_user_profile.user)
        self.make_http_request(self.client.post, self.url, status.HTTP_403_FORBIDDEN, data=self.request_data)

    def test_learner(self):
        """A learner can't send email"""
        self.client.force_login(self.profile.user)
        self.make_http_request(self.client.post, self.url, status.HTTP_403_FORBIDDEN, data=self.request_data)

    def test_anonymous(self):
        """
        Anonymous users can't send email
        """
        self.client.logout()
        self.make_http_request(self.client.post, self.url, status.HTTP_403_FORBIDDEN, data=self.request_data)

    @patch('mail.views.MailgunClient')
    def test_send_financial_aid_view(self, mock_mailgun_client):
        """
        Test that the FinancialAidMailView will accept and return expected values
        """
        self.client.force_login(self.staff_user_profile.user)
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        resp_post = self.client.post(self.url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs['acting_user'] == self.staff_user_profile.user
        assert called_kwargs['financial_aid'] == self.financial_aid
        assert called_kwargs['subject'] == self.request_data['email_subject']
        assert called_kwargs['body'] == self.request_data['email_body']
        assert 'raise_for_status' not in called_kwargs

    def test_send_financial_aid_view_improperly_configured(self):
        """
        Test that the FinancialAidMailView will raise ImproperlyConfigured if mailgun returns 401, which
        results in returning 500 since micromasters.utils.custom_exception_hanlder catches ImproperlyConfigured
        """
        self.client.force_login(self.staff_user_profile.user)
        with patch('mail.views.MailgunClient.send_batch', side_effect=ImproperlyConfigured):
            resp = self.client.post(self.url, data=self.request_data, format='json')
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
