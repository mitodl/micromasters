"""
Provides functions for sending and retrieving data about in-app email
"""
import json
from itertools import islice

import requests
from django.conf import settings


class MailgunClient:
    """
    Provides functions for communicating with the Mailgun REST API.
    """
    _basic_auth_credentials = ('api', settings.MAILGUN_KEY)
    _base_params = {'from': settings.MAILGUN_FROM_EMAIL}

    @classmethod
    def _mailgun_request(cls, request_func, endpoint, params):
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
        emails_params = {'from': settings.MAILGUN_FROM_EMAIL}
        emails_params.update(**params)
        return request_func(
            mailgun_url,
            auth=('api', settings.MAILGUN_KEY),
            data=dict(**emails_params)
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
    def send_batch(cls, subject, body, recipients, chunk_size=settings.MAILGUN_BATCH_CHUNK_SIZE):
        """
        Sends a text email to a list of recipients (one email per recipient) via batch.

        Args:
            subject (str): Email subject
            body (str): Text email body
            recipients (list): A list of recipient emails
            chunk_size (int): The maximum amount of emails to be sent at the same time

        Returns:
            list: List of requests.Response HTTP response from Mailgun
        """

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
            responses.append(cls._mailgun_request(requests.post, 'messages', params))
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
    def send_financial_aid_email(cls, subject, body, recipient):
        """
        Sends a text email to a single recipient, specifically as part of the financial aid workflow. This bundles
        saving an audit trail for emails sent (to be implemented).
        Args:
            subject (str): email subject
            body (str): email body
            recipient (str): email recipient
        Returns:
            requests.Response: response from Mailgun
        """
        return cls.send_individual_email(subject, body, recipient)
