"""
Test cases for email API
"""
import json
import string
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase, override_settings

from mail.api import MailgunClient

# pylint: disable=no-self-use


@patch('requests.post')
class MailAPITests(TestCase):
    """
    Tests for the Mailgun client class
    """
    @override_settings(MAILGUN_FROM_EMAIL='mailgun_from_email@example.com')
    def test_from_address(self, mock_post):
        """
        Test that the 'from' address for our emails is set correctly
        """
        # NOTE: Using patch.multiple to override settings values because Django's
        # override_settings decorator fails to work for mysterious reasons
        MailgunClient.send_bcc('email subject', 'email body', ['will_be_ignored@example.com'])
        _, called_kwargs = mock_post.call_args
        assert called_kwargs['data']['from'] == 'mailgun_from_email@example.com'

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE='override@example.com')
    def test_email_override(self, mock_post):
        """
        Test that an email override value will be used over recipients specified
        in MailgunClient.send_bcc
        """
        MailgunClient.send_bcc('email subject', 'email body', ['a@example.com', 'b@example.com'])
        _, called_kwargs = mock_post.call_args
        assert called_kwargs['data']['bcc'] == 'override@example.com'

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_no_email_override(self, mock_post):
        """
        Test that recipients passed to MailgunClient.send_bcc will be used when no email
        override exists
        """
        MailgunClient.send_bcc('email subject', 'email body', ['a@example.com', 'b@example.com'])
        _, called_kwargs = mock_post.call_args
        assert called_kwargs['data']['bcc'] == 'a@example.com,b@example.com'

    def test_send_bcc(self, mock_post):
        """
        Test that MailgunClient.send_bcc sends expected parameters to the Mailgun API
        """
        MailgunClient.send_bcc('email subject', 'email body', ['a@example.com', 'b@example.com'])
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == settings.MAILGUN_BCC_TO_EMAIL

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_batch(self, mock_post):
        """
        Test that MailgunClient.send_batch sends expected parameters to the Mailgun API
        Base case with only one batch call to the Mailgun API.
        """
        emails_to = ['a@example.com', 'b@example.com']
        MailgunClient.send_batch('email subject', 'email body', emails_to)
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == emails_to
        assert called_kwargs['data']['recipient-variables'] == json.dumps(
            {email: {} for email in emails_to}
        )

    @override_settings(MAILGUN_RECIPIENT_OVERRIDE=None)
    def test_send_batch_chunk(self, mock_post):
        """
        Test that MailgunClient.send_batch chunks recipients
        """
        chunk_size = 10
        emails_to = ["{0}@example.com".format(letter) for letter in string.ascii_letters]
        chuncked_emails_to = [emails_to[i:i + chunk_size] for i in range(0, len(emails_to), chunk_size)]
        assert len(emails_to) == 52
        MailgunClient.send_batch('email subject', 'email body', emails_to, chunk_size=chunk_size)
        assert mock_post.called
        assert mock_post.call_count == 6
        for call_num, args in enumerate(mock_post.call_args_list):
            called_args, called_kwargs = args
            assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
            assert called_kwargs['data']['text'].startswith('email body')
            assert called_kwargs['data']['subject'] == 'email subject'
            assert called_kwargs['data']['to'] == chuncked_emails_to[call_num]
            assert called_kwargs['data']['recipient-variables'] == json.dumps(
                {email: {} for email in chuncked_emails_to[call_num]}
            )

    def test_send_individual_email(self, mock_post):
        """
        Test that MailgunClient.send_individual_email() sends an individual message
        """
        MailgunClient.send_individual_email('email subject', 'email body', 'a@example.com')
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == ['a@example.com']


@patch('requests.post')
class FinancialAidMailAPITests(TestCase):
    """
    Tests for the Mailgun client class for financial aid
    """
    @override_settings(MAILGUN_FROM_EMAIL='mailgun_from_email@example.com')
    def test_financial_aid_email(self, mock_post):
        """
        Test that MailgunClient.send_financial_aid_email() sends an individual message
        """
        MailgunClient.send_financial_aid_email('email subject', 'email body', 'a@example.com')
        assert mock_post.called
        called_args, called_kwargs = mock_post.call_args
        assert list(called_args)[0] == '{}/{}'.format(settings.MAILGUN_URL, 'messages')
        assert called_kwargs['auth'] == ('api', settings.MAILGUN_KEY)
        assert called_kwargs['data']['text'].startswith('email body')
        assert called_kwargs['data']['subject'] == 'email subject'
        assert called_kwargs['data']['to'] == ['a@example.com']
