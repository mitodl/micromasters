"""
Test cases for email API
"""
import json
import string
from unittest.mock import Mock, patch

from ddt import ddt, data
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.test import override_settings
from elasticsearch_dsl import Search
from factory.django import mute_signals
from requests import Response
from requests.exceptions import HTTPError
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
)

from dashboard.models import ProgramEnrollment
from dashboard.factories import ProgramEnrollmentFactory
from courses.factories import (
    CourseFactory,
    CourseRunFactory,
)
from financialaid.factories import FinancialAidFactory
from mail.exceptions import SendBatchException
from mail.api import (
    MailgunClient,
    add_automatic_email,
    get_mail_vars,
    mark_emails_as_sent,
    send_automatic_emails,
)
from mail.models import (
    AutomaticEmail,
    FinancialAidEmailAudit,
    SentAutomaticEmail,
)
from mail.factories import AutomaticEmailFactory
from mail.views_test import mocked_json
from profiles.factories import ProfileFactory
from micromasters.factories import UserFactory
from search.api import adjust_search_for_percolator
from search.base import MockedESTestCase
from search.factories import PercolateQueryFactory
from search.models import PercolateQuery


@ddt
@patch('requests.post', autospec=True, return_value=Mock(
    spec=Response,
    status_code=HTTP_200_OK,
    json=mocked_json()
))
class MailAPITests(MockedESTestCase):
    """
    Tests for the Mailgun client class
    """
    batch_recipient_arg = [('a@example.com', None), ('b@example.com', {"name": "B"})]
    individual_recipient_arg = 'a@example.com'

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    @data(None, 'Tester')
    def test_send_batch(self, sender_name, mock_post):
        """
        Test that MailgunClient.send_batch sends expected parameters to the Mailgun API
        Base case with only one batch call to the Mailgun API.
        """
        email_body = '<h1>A title</h1><p> and some text <a href="www.google.com">google</a></p>'
        MailgunClient.send_batch('email subject', email_body, self.batch_recipient_arg, sender_name=sender_name)
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'] == "A title and some text www.google.com"
        assert called_kwargs['data']['html'] == email_body
        assert called_kwargs['data']['subject'] == 'email subject'
        assert sorted(called_kwargs['data']['to']) == sorted([email for email, _ in self.batch_recipient_arg])
        assert called_kwargs['data']['recipient-variables'] == json.dumps(
            {
                'a@example.com': {},
                'b@example.com': {'name': 'B'},
            }
        )
        if sender_name is not None:
            self.assertEqual(
                called_kwargs['data']['from'],
                "{sender_name} <{email}>".format(sender_name=sender_name, email=settings.EMAIL_SUPPORT)
            )
        else:
            self.assertEqual(called_kwargs['data']['from'], settings.EMAIL_SUPPORT)

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE='recipient@override.com')
    def test_send_batch_recipient_override(self, mock_post):
        """
        Test that MailgunClient.send_batch works properly with recipient override enabled
        """
        MailgunClient.send_batch('subject', 'body', self.batch_recipient_arg, sender_name='sender')
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'] == """body

[overridden recipient]
a@example.com: {}
b@example.com: {"name": "B"}"""
        assert called_kwargs['data']['subject'] == 'subject'
        assert called_kwargs['data']['to'] == ['recipient@override.com']
        assert called_kwargs['data']['recipient-variables'] == json.dumps(
            {
                'recipient@override.com': {},
            }
        )
        self.assertEqual(called_kwargs['data']['from'], "sender <support@example.com>")

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_batch_chunk(self, mock_post):
        """
        Test that MailgunClient.send_batch chunks recipients
        """
        chunk_size = 10
        recipient_tuples = [("{0}@example.com".format(letter), None) for letter in string.ascii_letters]
        chunked_emails_to = [recipient_tuples[i:i + chunk_size] for i in range(0, len(recipient_tuples), chunk_size)]
        assert len(recipient_tuples) == 52
        responses = MailgunClient.send_batch('email subject', 'email body', recipient_tuples, chunk_size=chunk_size)
        assert mock_post.called
        assert mock_post.call_count == 6
        for call_num, args in enumerate(mock_post.call_args_list):
            called_args, called_kwargs = args
            assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
            assert called_kwargs['data']['text'].startswith('email body')
            assert called_kwargs['data']['subject'] == 'email subject'
            assert sorted(called_kwargs['data']['to']) == sorted([email for email, _ in chunked_emails_to[call_num]])
            assert called_kwargs['data']['recipient-variables'] == json.dumps(
                {email: context or {} for email, context in chunked_emails_to[call_num]}
            )

            response = responses[call_num]
            assert response.status_code == HTTP_200_OK

    @data(None, 'recipient_override@example.com')
    def test_send_batch_error(self, recipient_override, mock_post):
        """
        Test that MailgunClient.send_batch returns a non-zero error code where the mailgun API returns a non-zero code
        """
        mock_post.return_value = Response()
        mock_post.return_value.status_code = HTTP_400_BAD_REQUEST

        chunk_size = 10
        recipient_tuples = [("{0}@example.com".format(letter), {"letter": letter}) for letter in string.ascii_letters]
        chunked_emails_to = [recipient_tuples[i:i + chunk_size] for i in range(0, len(recipient_tuples), chunk_size)]
        assert len(recipient_tuples) == 52
        with override_settings(
            MAILGUN_RECIPIENT_OVERRIDE=recipient_override,
        ), self.assertRaises(SendBatchException) as send_batch_exception:
            MailgunClient.send_batch('email subject', 'email body', recipient_tuples, chunk_size=chunk_size)

        if recipient_override is None:
            assert mock_post.call_count == 6
        else:
            assert mock_post.call_count == 1
            chunked_emails_to = [[(recipient_override, None)]]

        for call_num, args in enumerate(mock_post.call_args_list):
            called_args, called_kwargs = args
            assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
            assert called_kwargs['data']['text'].startswith('email body')
            assert called_kwargs['data']['subject'] == 'email subject'
            assert sorted(called_kwargs['data']['to']) == sorted([email for email, _ in chunked_emails_to[call_num]])
            assert called_kwargs['data']['recipient-variables'] == json.dumps(
                {email: context or {} for email, context in chunked_emails_to[call_num]}
            )

        exception_pairs = send_batch_exception.exception.exception_pairs
        if recipient_override is None:
            assert len(exception_pairs) == 6
            for call_num, (recipients, exception) in enumerate(exception_pairs):
                assert sorted(recipients) == sorted([email for email, _ in chunked_emails_to[call_num]])
                assert isinstance(exception, HTTPError)
        else:
            assert len(exception_pairs) == 1
            assert exception_pairs[0][0] == [recipient_override]
            assert isinstance(exception_pairs[0][1], HTTPError)

    def test_send_batch_400_no_raise(self, mock_post):
        """
        Test that if raise_for_status is False we don't raise an exception for a 400 response
        """
        mock_post.return_value = Mock(
            spec=Response,
            status_code=HTTP_400_BAD_REQUEST,
            json=mocked_json()
        )

        chunk_size = 10
        recipient_tuples = [("{0}@example.com".format(letter), None) for letter in string.ascii_letters]
        assert len(recipient_tuples) == 52
        with override_settings(
            MAILGUN_RECIPIENT_OVERRIDE=None,
        ):
            resp_list = MailgunClient.send_batch(
                'email subject', 'email body', recipient_tuples, chunk_size=chunk_size, raise_for_status=False
            )

        assert len(resp_list) == 6
        for resp in resp_list:
            assert resp.status_code == HTTP_400_BAD_REQUEST
        assert mock_post.call_count == 6
        assert mock_post.return_value.raise_for_status.called is False

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_batch_exception(self, mock_post):
        """
        Test that MailgunClient.send_batch returns a non-zero error code where the mailgun API returns a non-zero code
        """
        mock_post.side_effect = KeyError

        chunk_size = 10
        recipient_tuples = [("{0}@example.com".format(letter), None) for letter in string.ascii_letters]
        chunked_emails_to = [recipient_tuples[i:i + chunk_size] for i in range(0, len(recipient_tuples), chunk_size)]
        assert len(recipient_tuples) == 52
        with self.assertRaises(SendBatchException) as send_batch_exception:
            MailgunClient.send_batch('email subject', 'email body', recipient_tuples, chunk_size=chunk_size)
        assert mock_post.called
        assert mock_post.call_count == 6
        for call_num, args in enumerate(mock_post.call_args_list):
            called_args, called_kwargs = args
            assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
            assert called_kwargs['data']['text'].startswith('email body')
            assert called_kwargs['data']['subject'] == 'email subject'
            assert sorted(called_kwargs['data']['to']) == sorted([email for email, _ in chunked_emails_to[call_num]])
            assert called_kwargs['data']['recipient-variables'] == json.dumps(
                {email: context or {} for email, context in chunked_emails_to[call_num]}
            )

        exception_pairs = send_batch_exception.exception.exception_pairs
        assert len(exception_pairs) == 6
        for call_num, (recipients, exception) in enumerate(exception_pairs):
            assert sorted(recipients) == sorted([email for email, _ in chunked_emails_to[call_num]])
            assert isinstance(exception, KeyError)

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_batch_improperly_configured(self, mock_post):
        """
        If MailgunClient.send_batch returns a 401, it should raise a ImproperlyConfigured exception
        """
        mock_post.return_value = Mock(
            spec=Response,
            status_code=HTTP_401_UNAUTHORIZED,
        )

        chunk_size = 10
        recipient_pairs = [("{0}@example.com".format(letter), None) for letter in string.ascii_letters]
        with self.assertRaises(ImproperlyConfigured) as ex:
            MailgunClient.send_batch('email subject', 'email body', recipient_pairs, chunk_size=chunk_size)
        assert ex.exception.args[0] == "Mailgun API keys not properly configured."

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_batch_empty(self, mock_post):
        """If the recipient list is empty there should be no attempt to mail users"""
        assert MailgunClient.send_batch('subject', 'body', []) == []
        assert mock_post.called is False

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    @data(None, 'Tester')
    def test_send_individual_email(self, sender_name, mock_post):
        """
        Test that MailgunClient.send_individual_email() sends an individual message
        """
        context = {'abc': {'def': 'xyz'}}
        response = MailgunClient.send_individual_email(
            subject='email subject',
            body='email body',
            recipient='a@example.com',
            recipient_variables=context,
            sender_name=sender_name,
        )
        assert response.status_code == HTTP_200_OK
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == ['a@example.com']
        assert called_kwargs['data']['recipient-variables'] == json.dumps({'a@example.com': context})
        if sender_name is not None:
            self.assertEqual(
                called_kwargs['data']['from'],
                "{sender_name} <{email}>".format(sender_name=sender_name, email=settings.EMAIL_SUPPORT)
            )
        else:
            self.assertEqual(called_kwargs['data']['from'], settings.EMAIL_SUPPORT)

    @data(True, False)
    def test_send_individual_email_error(self, raise_for_status, mock_post):
        """
        Test handling of errors for send_individual_email
        """
        mock_post.return_value = Mock(
            spec=Response,
            status_code=HTTP_400_BAD_REQUEST,
            json=mocked_json()
        )

        response = MailgunClient.send_individual_email(
            subject='email subject',
            body='email body',
            recipient='a@example.com',
            raise_for_status=raise_for_status,
        )

        assert response.raise_for_status.called is raise_for_status
        assert response.status_code == HTTP_400_BAD_REQUEST
        assert response.json() == {}

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_with_sender_address(self, mock_post):
        """
        Test that specifying a sender address in our mail API functions will result in an email
        with the sender address in the 'from' field
        """
        sender_address = 'sender@example.com'
        MailgunClient.send_batch(
            'email subject', 'email body', self.batch_recipient_arg, sender_address=sender_address
        )
        MailgunClient.send_individual_email(
            'email subject', 'email body', self.individual_recipient_arg, sender_address=sender_address
        )
        for args in mock_post.call_args_list:
            _, called_kwargs = args
            assert called_kwargs['data']['from'] == sender_address


@ddt
@patch('requests.post', autospec=True, return_value=Mock(
    spec=Response,
    status_code=HTTP_200_OK,
    json=mocked_json()
))
class FinancialAidMailAPITests(MockedESTestCase):
    """
    Tests for the Mailgun client class for financial aid
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.staff_user_profile = ProfileFactory.create()
        course_run = CourseRunFactory.create()
        cls.financial_aid = FinancialAidFactory.create()
        cls.tier_program = cls.financial_aid.tier_program
        cls.tier_program.program = course_run.course.program
        cls.tier_program.save()
        cls.program_enrollment = ProgramEnrollment.objects.create(
            user=cls.financial_aid.user,
            program=cls.tier_program.program
        )

    def setUp(self):
        self.financial_aid.refresh_from_db()

    @override_settings(
        EMAIL_SUPPORT='mailgun_from_email@example.com',
        MAILGUN_RECIPIENT_OVERRIDE=None
    )
    def test_financial_aid_email(self, mock_post):
        """
        Test that MailgunClient.send_financial_aid_email() sends an individual message
        """
        assert FinancialAidEmailAudit.objects.count() == 0
        response = MailgunClient.send_financial_aid_email(
            self.staff_user_profile.user,
            self.financial_aid,
            'email subject',
            'email body'
        )
        assert response.status_code == HTTP_200_OK
        # Check method call
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'] == 'email body'
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == [self.financial_aid.user.email]
        assert called_kwargs['data']['from'] == settings.EMAIL_SUPPORT
        # Check audit creation
        assert FinancialAidEmailAudit.objects.count() == 1
        audit = FinancialAidEmailAudit.objects.first()
        assert audit.acting_user == self.staff_user_profile.user
        assert audit.financial_aid == self.financial_aid
        assert audit.to_email == self.financial_aid.user.email
        assert audit.from_email == settings.EMAIL_SUPPORT
        assert audit.email_subject == 'email subject'
        assert audit.email_body == 'email body'

    @override_settings(
        EMAIL_SUPPORT='mailgun_from_email@example.com',
        MAILGUN_RECIPIENT_OVERRIDE=None
    )
    @data(True, False)
    def test_financial_aid_email_error(self, raise_for_status, mock_post):
        """
        Test that send_financial_aid_email handles errors correctly
        """
        mock_post.return_value = Mock(
            spec=Response,
            status_code=HTTP_400_BAD_REQUEST,
            json=mocked_json(),
        )

        response = MailgunClient.send_financial_aid_email(
            self.staff_user_profile.user,
            self.financial_aid,
            'email subject',
            'email body',
            raise_for_status=raise_for_status,
        )

        assert response.raise_for_status.called is raise_for_status
        assert response.status_code == HTTP_400_BAD_REQUEST
        assert response.json() == {}

    @override_settings(
        EMAIL_SUPPORT='mailgun_from_email@example.com',
        MAILGUN_RECIPIENT_OVERRIDE=None
    )
    def test_financial_aid_email_with_blank_subject_and_body(self, mock_post):
        """
        Test that MailgunClient.send_financial_aid_email() sends an individual message
        with blank subject and blank email, and that the audit record saves correctly
        """
        assert FinancialAidEmailAudit.objects.count() == 0
        MailgunClient.send_financial_aid_email(
            self.staff_user_profile.user,
            self.financial_aid,
            '',
            ''
        )
        # Check method call
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'] == ''
        assert called_kwargs['data']['subject'] == ''
        assert called_kwargs['data']['to'] == [self.financial_aid.user.email]
        assert called_kwargs['data']['from'] == settings.EMAIL_SUPPORT
        # Check audit creation
        assert FinancialAidEmailAudit.objects.count() == 1
        audit = FinancialAidEmailAudit.objects.first()
        assert audit.acting_user == self.staff_user_profile.user
        assert audit.financial_aid == self.financial_aid
        assert audit.to_email == self.financial_aid.user.email
        assert audit.from_email == settings.EMAIL_SUPPORT
        assert audit.email_subject == ''
        assert audit.email_body == ''


@ddt
@patch('requests.post', autospec=True, return_value=Mock(
    spec=Response,
    status_code=HTTP_200_OK,
    json=mocked_json()
))
class CourseTeamMailAPITests(MockedESTestCase):
    """
    Tests for course team contact functionality in the Mailgun client class
    """
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.user_profile = ProfileFactory.create()
        cls.user = cls.user_profile.user

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_course_team_email(self, mock_post):
        """
        Tests that a course team contact email is sent correctly
        """
        course_with_email = CourseFactory.create(title='course with email', contact_email='course@example.com')
        response = MailgunClient.send_course_team_email(
            self.user,
            course_with_email,
            'email subject',
            'email body'
        )
        assert response.status_code == HTTP_200_OK
        assert mock_post.called
        _, called_kwargs = mock_post.call_args
        assert called_kwargs['data']['text'] == 'email body'
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == [course_with_email.contact_email]
        self.assertEqual(
            called_kwargs['data']['from'],
            '{} <{}>'.format(self.user_profile.display_name, self.user.email)
        )

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_to_course_team_without_email(self, mock_post):
        """
        Tests that an attempt to send an email to a course with no contact email will fail
        """
        course_no_email = CourseFactory.create(title='course no email', contact_email=None)
        with self.assertRaises(ImproperlyConfigured) as ex:
            MailgunClient.send_course_team_email(
                self.user,
                course_no_email,
                'email subject',
                'email body'
            )
        assert ex.exception.args[0].startswith('Course team contact email attempted')
        assert not mock_post.called

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    @data(True, False)
    def test_send_to_course_team_error(self, raise_for_status, mock_post):
        """
        Test that send_course_team_email handles errors correctly
        """
        mock_post.return_value = Mock(
            spec=Response,
            status_code=HTTP_400_BAD_REQUEST,
            json=mocked_json(),
        )
        course_with_email = CourseFactory.create(title='course with email', contact_email='course@example.com')

        response = MailgunClient.send_course_team_email(
            self.user,
            course_with_email,
            'email subject',
            'email body',
            raise_for_status=raise_for_status,
        )
        assert response.raise_for_status.called is raise_for_status
        assert response.status_code == HTTP_400_BAD_REQUEST
        assert response.json() == {}


@ddt
class AutomaticEmailTests(MockedESTestCase):
    """Tests regarding automatic emails"""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.program_enrollment_unsent = ProgramEnrollmentFactory.create()
        cls.program_enrollment_sent = ProgramEnrollmentFactory.create()
        cls.automatic_email = AutomaticEmailFactory.create(enabled=True)
        cls.percolate_query = cls.automatic_email.query
        cls.other_query = PercolateQueryFactory.create(source_type=PercolateQuery.DISCUSSION_CHANNEL_TYPE)
        cls.percolate_queries = [cls.percolate_query, cls.other_query]
        cls.automatic_email_disabled = AutomaticEmailFactory.create(enabled=False)
        cls.percolate_query_disabled = cls.automatic_email_disabled.query
        SentAutomaticEmail.objects.create(
            automatic_email=cls.automatic_email,
            user=cls.program_enrollment_sent.user,
            status=SentAutomaticEmail.SENT,
        )
        # User was sent email connected to a different AutomaticEmail
        SentAutomaticEmail.objects.create(
            user=cls.program_enrollment_unsent.user,
            automatic_email=AutomaticEmailFactory.create(enabled=True),
            status=SentAutomaticEmail.SENT,
        )
        with mute_signals(post_save):
            cls.staff_user = UserFactory.create()

    def test_send_automatic_emails(self):
        """send_automatic_emails should send emails to users which fit criteria and mark them so we don't send twice"""
        with patch(
            'mail.api.search_percolate_queries', autospec=True, return_value=self.percolate_queries,
        ) as mock_search_queries, patch('mail.api.MailgunClient') as mock_mailgun:
            send_automatic_emails(self.program_enrollment_unsent)

        recipient_tuples = [
            (context['email'], context) for context in get_mail_vars([self.program_enrollment_unsent.user.email])
        ]
        mock_search_queries.assert_called_with(self.program_enrollment_unsent.id, PercolateQuery.AUTOMATIC_EMAIL_TYPE)
        mock_mailgun.send_batch.assert_called_with(
            self.automatic_email.email_subject,
            self.automatic_email.email_body,
            recipient_tuples,
            sender_name=self.automatic_email.sender_name,
        )

    def test_no_matching_query(self):
        """If there are no queries matching percolate we should do nothing"""
        with patch(
            'mail.api.search_percolate_queries', autospec=True, return_value=[],
        ) as mock_search_queries, patch('mail.api.MailgunClient') as mock_mailgun:
            send_automatic_emails(self.program_enrollment_unsent)

        mock_search_queries.assert_called_with(self.program_enrollment_unsent.id, PercolateQuery.AUTOMATIC_EMAIL_TYPE)
        assert mock_mailgun.send_individual_email.called is False

    def test_not_enabled(self):
        """If the automatic email is not enabled we should do nothing"""
        with patch(
            'mail.api.search_percolate_queries', autospec=True, return_value=[self.percolate_query_disabled],
        ) as mock_search_queries, patch('mail.api.MailgunClient') as mock_mailgun:
            send_automatic_emails(self.program_enrollment_unsent)

        mock_search_queries.assert_called_with(self.program_enrollment_unsent.id, PercolateQuery.AUTOMATIC_EMAIL_TYPE)
        assert mock_mailgun.send_individual_email.called is False

    def test_already_sent(self):
        """If a user was already sent email we should not send it again"""
        with patch(
            'mail.api.search_percolate_queries', autospec=True, return_value=self.percolate_queries,
        ) as mock_search_queries, patch('mail.api.MailgunClient') as mock_mailgun:
            send_automatic_emails(self.program_enrollment_sent)

        mock_search_queries.assert_called_with(self.program_enrollment_sent.id, PercolateQuery.AUTOMATIC_EMAIL_TYPE)
        assert mock_mailgun.send_individual_email.called is False

    def test_failed_send(self):
        """If we fail to send email to the first user we should still send it to the second"""

        new_automatic = AutomaticEmailFactory.create(enabled=True)

        with patch('mail.api.search_percolate_queries', autospec=True, return_value=[
            self.percolate_query, new_automatic.query
        ]) as mock_search_queries, patch(
            'mail.api.MailgunClient', send_individual_email=Mock(side_effect=[KeyError(), None])
        ) as mock_mailgun:
            send_automatic_emails(self.program_enrollment_unsent)

        mock_search_queries.assert_called_with(self.program_enrollment_unsent.id, PercolateQuery.AUTOMATIC_EMAIL_TYPE)
        assert mock_mailgun.send_batch.call_count == 2

    def test_add_automatic_email(self):
        """Add an AutomaticEmail entry with associated PercolateQuery"""
        assert AutomaticEmail.objects.count() == 3
        search_obj = Search.from_dict({"query": {"match": {}}})

        new_automatic = add_automatic_email(search_obj, 'subject', 'body', 'sender', self.staff_user)
        assert AutomaticEmail.objects.count() == 4
        assert new_automatic.sender_name == 'sender'
        assert new_automatic.email_subject == 'subject'
        assert new_automatic.email_body == 'body'
        assert new_automatic.query.query == adjust_search_for_percolator(search_obj).to_dict()
        assert new_automatic.query.source_type == PercolateQuery.AUTOMATIC_EMAIL_TYPE
        assert new_automatic.staff_user == self.staff_user

    @data(True, False)
    def test_mark_emails_as_sent(self, errored):
        """Mark emails as sent"""
        emails = [
            self.program_enrollment_unsent.user.email,
            self.program_enrollment_sent.user.email,
        ]
        try:
            with mark_emails_as_sent(self.automatic_email, emails) as user_ids:
                assert sorted(user_ids) == [self.program_enrollment_unsent.user.id]
                if errored:
                    raise KeyError
        except KeyError:
            pass

        expected = [self.program_enrollment_sent.user.email] if errored else sorted(emails)
        assert sorted(self.automatic_email.sentautomaticemail_set.filter(
            status=SentAutomaticEmail.SENT
        ).values_list('user__email', flat=True)) == expected


class RecipientVariablesTests(MockedESTestCase):
    """Tests for recipient variables"""

    def test_get_mail_vars(self):
        """
        get_mail_vars should output a dict of relevant mail variables plus the email address
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()

        assert list(get_mail_vars([profile.user.email])) == [{
            'email': profile.user.email,
            'mail_id': profile.mail_id.hex,
            'preferred_name': profile.preferred_name,
        }]

    def test_missing_email(self):
        """get_mail_vars should skip missing emails without erroring"""
        assert list(get_mail_vars(['missing@email.com'])) == []

    def test_missing_profile(self):
        """get_mail_vars should skip User objects without a Profile"""
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        user = profile.user
        profile.delete()

        assert list(get_mail_vars([user.email])) == []
