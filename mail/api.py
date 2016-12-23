"""
Provides functions for sending and retrieving data about in-app email
"""
from itertools import islice
import json
import requests

from django.conf import settings
from rest_framework.status import HTTP_200_OK

from mail.models import FinancialAidEmailAudit


class MailgunClient:
    """
    Provides functions for communicating with the Mailgun REST API.
    """
    _basic_auth_credentials = ('api', settings.MAILGUN_KEY)

    @staticmethod
    def get_base_params(sender_name=None):
        """
        Base params for Mailgun request. This a method instead of an attribute to allow for overrides.

        Args:
            sender_name (str): email's sender name.

        Returns:
            json: json object containing email from info.
        """
        email_from = settings.MAILGUN_FROM_EMAIL
        if sender_name:
            email_from = "{sender_name} {email}".format(sender_name=sender_name, email=email_from)
        return {'from': email_from}

    @classmethod
    def _mailgun_request(cls, request_func, endpoint, params, sender_name=None):
        """
        Sends a request to the Mailgun API

        Args:
            request_func (function): requests library HTTP function (get/post/etc.)
            endpoint (str): Mailgun endpoint (eg: 'messages', 'events')
            params (dict): Dict of params to add to the request as 'data'

        Returns:
            requests.Response: HTTP response
        """
        mailgun_url = '{}/{}'.format(settings.MAILGUN_URL, endpoint)
        email_params = params.copy()
        email_params.update(cls.get_base_params(sender_name))
        return request_func(
            mailgun_url,
            auth=cls._basic_auth_credentials,
            data=email_params
        )

    @classmethod
    def _recipient_override(cls, body, recipients):
        """
        Helper method to override body and recipients of an email.
        If the MAILGUN_RECIPIENT_OVERRIDE setting is specified, the list of recipients
        will be ignored in favor of the recipients in that setting value.

        Args:
            body (str): Text email body
            recipients (list): A list of recipient emails

        Returns:
            tuple: A tuple of the (possibly) overriden recipients list and email body
        """
        if settings.MAILGUN_RECIPIENT_OVERRIDE is not None:
            body = '{0}\n\n[overridden recipient]\n{1}'.format(body, '\n'.join(recipients))
            recipients = [settings.MAILGUN_RECIPIENT_OVERRIDE]
        return body, recipients

    @classmethod
    def send_bcc(cls, subject, body, recipients):
        """
        Sends a text email to a BCC'ed list of recipients.

        Args:
            subject (str): Email subject
            body (str): Text email body
            recipients (list): A list of recipient emails

        Returns:
            requests.Response: HTTP response from Mailgun
        """
        body, recipients = cls._recipient_override(body, recipients)
        params = dict(
            to=settings.MAILGUN_BCC_TO_EMAIL,
            bcc=','.join(recipients),
            subject=subject,
            text=body
        )
        return cls._mailgun_request(requests.post, 'messages', params)

    @classmethod
    def send_batch(cls, subject, body, recipients, chunk_size=settings.MAILGUN_BATCH_CHUNK_SIZE, sender_name=None):
        """
        Sends a text email to a list of recipients (one email per recipient) via batch.

        Args:
            subject (str): Email subject
            body (str): Text email body
            recipients (list): A list of recipient emails
            chunk_size (int): The maximum amount of emails to be sent at the same time
            sender_name (str): email sender name.

        Returns:
            list: List of requests.Response HTTP response from Mailgun
        """
        # pylint: disable=too-many-arguments
        body, recipients = cls._recipient_override(body, recipients)
        responses = []

        recipients = iter(recipients)
        chunk = list(islice(recipients, chunk_size))
        while len(chunk) > 0:
            params = dict(
                to=chunk,
                subject=subject,
                text=body
            )
            params['recipient-variables'] = json.dumps({email: {} for email in chunk})
            responses.append(cls._mailgun_request(requests.post, 'messages', params, sender_name))
            chunk = list(islice(recipients, chunk_size))

        return responses

    @classmethod
    def send_individual_email(cls, subject, body, recipient):
        """
        Sends a text email to a single recipient.
        Args:
            subject (str): email subject
            body (str): email body
            recipient (str): email recipient
        Returns:
            requests.Response: response from Mailgun
        """
        # Since .send_batch() returns a list, we need to return the first in the list
        responses = cls.send_batch(subject, body, [recipient])
        return responses[0]

    @classmethod
    def send_financial_aid_email(cls, acting_user, financial_aid, subject, body):
        """
        Sends a text email to a single recipient, specifically as part of the financial aid workflow. This bundles
        saving an audit trail for emails sent (to be implemented).
        Args:
            acting_user (User): the user who is initiating this request, for auditing purposes
            financial_aid (FinancialAid): the FinancialAid object this pertains to (recipient is pulled from here)
            subject (str): email subject
            body (str): email body
        Returns:
            requests.Response: response from Mailgun
        """
        response = cls.send_individual_email(subject, body, financial_aid.user.email)
        if response.status_code == HTTP_200_OK:
            FinancialAidEmailAudit.objects.create(
                acting_user=acting_user,
                financial_aid=financial_aid,
                to_email=financial_aid.user.email,
                from_email=cls.get_base_params()['from'],
                email_subject=subject,
                email_body=body
            )
        return response
