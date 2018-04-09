"""
Tests for HTTP email API views
"""
from unittest.mock import Mock, patch
import ddt

from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
from django.db.models.signals import post_save
from django.test import override_settings
from django.test.client import RequestFactory
from requests.exceptions import HTTPError
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.response import Response
from factory.django import mute_signals

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from dashboard.factories import (
    ProgramEnrollmentFactory,
    CachedEnrollmentFactory,
)
from dashboard.models import ProgramEnrollment, CachedEnrollment
from financialaid.api_test import (
    FinancialAidBaseTestCase,
    create_program,
    create_enrolled_profile,
)
from financialaid.factories import FinancialAidFactory, TierProgramFactory
from mail.exceptions import SendBatchException
from mail.factories import AutomaticEmailFactory
from mail.models import SentAutomaticEmail, AutomaticEmail
from mail.serializers import AutomaticEmailSerializer
from mail.utils import get_email_footer
from mail.views import MailWebhookView
from profiles.factories import (
    ProfileFactory,
    UserFactory,
)
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


class SearchResultMailViewsBase(MockedESTestCase, APITestCase):
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
        self.email_results = {'a@example.com', 'b@example.com'}
        self.email_vars = [{
            'email': 'a@example.com',
            'mail_id': 'id1',
            'first_name': 'A',
        }, {
            'email': 'b@example.com',
            'mail_id': 'id2',
            'first_name': 'B',
        }]
        self.recipient_tuples = [(context['email'], context) for context in self.email_vars]


class SearchResultMailViewsTests(SearchResultMailViewsBase):
    """Tests for the mail API"""

    def test_send_view(self):
        """
        Test that the SearchResultMailView will accept and return expected values
        """
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=self.email_results
        ) as mock_get_emails, patch(
            'mail.views.MailgunClient'
        ) as mock_mailgun_client, patch(
            'mail.views.get_mail_vars', autospec=True, return_value=self.email_vars,
        ) as mock_get_mail_vars:
            mock_mailgun_client.send_batch.return_value = [Response()]
            resp_post = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK
        assert resp_post.data == {}
        assert mock_get_emails.called
        assert mock_get_emails.call_args[0][0].to_dict() == create_search_obj(
            user=self.staff,
            search_param_dict=self.request_data['search_request'],
            filter_on_email_optin=True,
        ).to_dict()

        assert mock_mailgun_client.send_batch.called
        _, called_kwargs = mock_mailgun_client.send_batch.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        self.assertIn(self.request_data['email_body'], called_kwargs['body'])
        self.assertIn('edit your settings', called_kwargs['body'])
        assert list(called_kwargs['recipients']) == self.recipient_tuples
        mock_get_mail_vars.assert_called_once_with(self.email_results)

    def test_view_response_error(self):
        """
        If there's at least one non-zero status code from Mailgun, we should return a 500 status code in our response.
        """
        exception_pairs = [
            ['b@example.com'], HTTPError()
        ]
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=self.email_results
        ), patch(
            'mail.views.MailgunClient'
        ) as mock_mailgun_client, patch(
            'mail.views.get_mail_vars', autospec=True, return_value=self.email_vars,
        ) as mock_get_mail_vars:
            mock_mailgun_client.send_batch.side_effect = SendBatchException(exception_pairs)
            with self.assertRaises(SendBatchException) as send_batch_exception:
                self.client.post(self.search_result_mail_url, data=self.request_data, format='json')

        assert send_batch_exception.exception.exception_pairs == exception_pairs
        mock_get_mail_vars.assert_called_once_with(self.email_results)

    def test_view_response_improperly_configured(self):
        """
        Test that the SearchResultMailView will raise ImproperlyConfigured if mailgun returns 401, which
        results in returning 500 since micromasters.utils.custom_exception_handler catches ImproperlyConfigured
        """
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=self.email_results
        ), patch(
            'mail.views.MailgunClient'
        ) as mock_mailgun_client, patch(
            'mail.views.get_mail_vars', autospec=True, return_value=self.email_vars,
        ) as mock_get_mail_vars:
            mock_mailgun_client.send_batch.side_effect = ImproperlyConfigured
            resp = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        mock_get_mail_vars.assert_called_once_with(self.email_results)

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


class AutomaticEmailTests(SearchResultMailViewsBase):
    """Tests for automatic emails created by search mail view"""

    def setUp(self):
        super().setUp()

        self.request_data = self.request_data.copy()
        self.request_data['send_automatic_emails'] = True
        for email in self.email_results:
            UserFactory.create(email=email)

        self.automatic_email = AutomaticEmailFactory.create()
        self.search_obj = create_search_obj(
            user=self.staff,
            search_param_dict=self.request_data['search_request'],
            filter_on_email_optin=True,
        )

    def test_automatic_email(self):
        """
        If send_automatic_emails is set to true, we should save the information in the AutomaticEmail model
        """
        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=self.email_results
        ) as mock_get_emails, patch(
            'mail.views.MailgunClient', send_batch=Mock(return_value=Response())
        ) as mock_mailgun_client, patch(
            'mail.views.add_automatic_email', autospec=True, return_value=self.automatic_email,
        ) as mock_add_automatic_email, patch(
            'mail.views.get_mail_vars', autospec=True, return_value=self.email_vars,
        ) as mock_get_mail_vars:
            resp_post = self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK
        assert mock_get_emails.call_args[0][0].to_dict() == self.search_obj.to_dict()

        assert mock_mailgun_client.send_batch.called
        _, called_kwargs = mock_mailgun_client.send_batch.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        body_result = self.request_data['email_body'] + get_email_footer('http://testserver/settings')
        assert called_kwargs['body'] == body_result
        assert list(called_kwargs['recipients']) == self.recipient_tuples

        assert mock_add_automatic_email.call_args[0][0].to_dict() == self.search_obj.to_dict()
        assert mock_add_automatic_email.call_args[1] == {
            "email_subject": self.request_data['email_subject'],
            "email_body": body_result,
            "sender_name": full_name(self.staff),
            "staff_user": self.staff,
        }

        mock_get_mail_vars.assert_called_once_with(list(self.email_results))

        assert SentAutomaticEmail.objects.filter(
            user__email__in=self.email_results,
            automatic_email=self.automatic_email,
            status=SentAutomaticEmail.SENT,
        ).count() == len(self.email_results)

    def test_automatic_email_fail(self):
        """
        If one request fails, we should mark all other success emails as having been sent anyway
        """
        success_emails = {'a@example.com'}
        failure_emails = self.email_results.difference(success_emails)
        exception_pairs = [
            (failure_emails, HTTPError())
        ]

        with patch(
            'mail.views.get_all_query_matching_emails', autospec=True, return_value=self.email_results
        ), patch(
            'mail.views.MailgunClient', send_batch=Mock(side_effect=SendBatchException(exception_pairs))
        ) as mock_mailgun_client, patch(
            'mail.views.add_automatic_email', autospec=True, return_value=self.automatic_email,
        ) as mock_add_automatic_email, patch(
            'mail.views.get_mail_vars', autospec=True, return_value=self.email_vars,
        ) as mock_get_mail_vars:
            with self.assertRaises(SendBatchException) as send_batch_exception:
                self.client.post(self.search_result_mail_url, data=self.request_data, format='json')
        assert send_batch_exception.exception.exception_pairs == exception_pairs

        assert mock_mailgun_client.send_batch.called
        _, called_kwargs = mock_mailgun_client.send_batch.call_args
        assert called_kwargs['subject'] == self.request_data['email_subject']
        body_result = self.request_data['email_body'] + get_email_footer('http://testserver/settings')
        assert called_kwargs['body'] == body_result
        assert list(called_kwargs['recipients']) == self.recipient_tuples

        assert mock_add_automatic_email.call_args[0][0].to_dict() == self.search_obj.to_dict()
        assert mock_add_automatic_email.call_args[1] == {
            "email_subject": self.request_data['email_subject'],
            "email_body": body_result,
            "sender_name": full_name(self.staff),
            "staff_user": self.staff,
        }

        mock_get_mail_vars.assert_called_once_with(list(self.email_results))

        assert sorted(SentAutomaticEmail.objects.filter(
            user__email__in=self.email_results,
            automatic_email=self.automatic_email,
            status=SentAutomaticEmail.SENT,
        ).values_list('user__email', flat=True)) == sorted(success_emails)


class AutomaticEmailViewTests(APITestCase, MockedESTestCase):
    """
    AutomaticEmailViewTests
    """

    @classmethod
    def setUpTestData(cls):
        cls.staff_user = UserFactory.create()
        cls.program = ProgramFactory.create()
        Role.objects.create(
            user=cls.staff_user,
            program=cls.program,
            role=Staff.ROLE_ID,
        )
        cls.url = reverse('automatic_email_api-list')

    def setUp(self):
        self.client.force_login(self.staff_user)

    def test_normal_users_cant_get(self):
        """
        normal users shouldnt be able to get any data
        """
        normal_user = UserFactory.create()
        self.client.force_login(normal_user)
        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_should_get_empty_list_if_no_emails(self):
        """
        should return an empty list if there are no emails associated with that user
        """
        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_should_get_list_of_automatic_emails(self):
        """
        If the user is a staff user and they have AutomaticEmails they
        should be able to get the data
        """
        for _ in range(2):
            AutomaticEmailFactory.create(staff_user=self.staff_user)
        response = self.client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == AutomaticEmailSerializer(
            AutomaticEmail.objects.all(),
            many=True,
        ).data

    def test_normal_users_cant_patch(self):
        """
        A non-staff user shouldn't be able to issue a PATCH request
        """
        normal_user = UserFactory.create()
        self.client.force_login(normal_user)
        automatic = AutomaticEmailFactory.create(staff_user=self.staff_user)
        url = reverse('automatic_email_api-detail', kwargs={'email_id': automatic.id})
        response = self.client.patch(url, {}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_should_patch_and_update(self):
        """
        Should let us update an existing automatic email!
        """
        automatic = AutomaticEmailFactory.create(staff_user=self.staff_user)
        url = reverse('automatic_email_api-detail', kwargs={'email_id': automatic.id})
        update = {
            "enabled": not automatic.enabled,
            "email_subject": "new subject",
            "email_body": "new body",
            "id": automatic.id
        }
        response = self.client.patch(url, update, format='json')
        assert response.status_code == status.HTTP_200_OK
        automatic.refresh_from_db()
        assert automatic.email_subject == update["email_subject"]
        assert automatic.email_body == update["email_body"]
        assert automatic.enabled == update["enabled"]


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
            recipient_profile = ProfileFactory.create(
                user__email='recipient@example.com',
                email_optin=True,
            )
        cls.staff_user = staff_profile.user
        cls.recipient_user = recipient_profile.user
        cls.program = ProgramFactory.create(financial_aid_availability=False)
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

    def test_learner_view_recipient_opted_out(self):
        """
        Test that an attempt to email a recipient who has opted out of emails will result in an error
        """
        self.client.force_login(self.staff_user)
        with mute_signals(post_save):
            opted_out_profile = ProfileFactory.create(
                user__email='opted_out_recipient@example.com',
                email_optin=False
            )
        url = reverse(self.url_name, kwargs={'student_id': opted_out_profile.student_id})
        resp_post = self.client.post(url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_403_FORBIDDEN

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

    @patch('mail.views.MailgunClient')
    def test_learner_view_needs_paid_learner(self, mock_mailgun_client):
        """
        Test that a learner attempting to email another learner will only succeed if the sender
        has paid for a course run in a program that the recipient is enrolled in
        """
        mock_mailgun_client.send_individual_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        with mute_signals(post_save):
            learner_profile = ProfileFactory.create(
                user__email='learner_sender@example.com',
                email_optin=True,
            )
        learner_user = learner_profile.user
        ProgramEnrollmentFactory.create(user=learner_user, program=self.program)
        CachedEnrollment.objects.filter(user=learner_user).delete()

        self.client.force_login(learner_user)
        url = reverse(self.url_name, kwargs={'student_id': self.recipient_user.profile.student_id})
        resp_post = self.client.post(url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_403_FORBIDDEN
        CachedEnrollmentFactory.create(user=learner_user, course_run__course__program=self.program, verified=True)
        resp_post = self.client.post(url, data=self.request_data, format='json')
        assert resp_post.status_code == status.HTTP_200_OK


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


@ddt.ddt
class EmailBouncedViewTests(APITestCase, MockedESTestCase):
    """Test email bounce view web hook"""
    def setUp(self):
        super().setUp()
        self.url = reverse('mailgun_webhook')

    def test_missing_signature(self):
        """Test that webhook api returns status code 403"""
        resp_post = self.client.post(
            self.url,
            data={
                "event": "bounced",
                "recipient": "c@example.com",
                "error": "Unable to send email"
            }
        )
        # api returns status code 403 because signature is not provided
        assert resp_post.status_code == status.HTTP_403_FORBIDDEN

    @override_settings(MAILGUN_KEY="key-12345")
    @ddt.data(
        ("d717895b90e49108c74df5e0cecf0d80b20e2fb2ed836bfa9209b723d57b2e77", status.HTTP_200_OK),
        ("f717895b90e49108c74df5e0cecf0d80b20e2fb2ed836bfa9209b723d57b2e88", status.HTTP_403_FORBIDDEN),
    )
    @ddt.unpack
    def test_signature(self, signature, status_code):
        """Test that webhook api returns status code 200 when valid data"""
        resp_post = self.client.post(
            self.url,
            data={
                "event": "bounced",
                "recipient": "c@example.com",
                "error": "Unable to send email",
                "timestamp": 1507117424,
                "token": "43f17fa66f43f64ee7f6f0927b03c5b60a4c5eb88cfff4b2c1",
                "signature": signature,
            }
        )
        # api returns status code 200 when signature is valid
        assert resp_post.status_code == status_code

    @patch('mail.views.log')
    @ddt.data(
        (True, "error"),
        (False, "debug")
    )
    @ddt.unpack
    def test_bounce(self, log_error_on_bounce, logger, mock_logger):
        """Tests that api logs error when email is bounced"""
        data = {
            "event": "bounced",
            "recipient": "c@example.com",
            "error": "Unable to send email",
            "log_error_on_bounce": log_error_on_bounce,
            "message-headers": "[[\"sender\": \"xyx@example.com\"]]"
        }
        error_msg = (
            "Webhook event {event} received by Mailgun for recipient {to}: {error} {header}".format(
                to=data["recipient"],
                error=data["error"],
                event=data["event"],
                header=data["message-headers"]
            )
        )
        factory = RequestFactory()
        request = factory.post(self.url, data=data)
        MailWebhookView().post(request)

        # assert that error message is logged
        getattr(mock_logger, logger).assert_called_with(error_msg)
