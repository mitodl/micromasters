"""
Provides functions for sending and retrieving data about in-app email
"""
import logging
from itertools import islice
import json
import requests

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status

from mail.models import FinancialAidEmailAudit


log = logging.getLogger(__name__)


class MailgunClient:
    """
    Provides functions for communicating with the Mailgun REST API.
    """
    _basic_auth_credentials = ('api', settings.MAILGUN_KEY)

    @staticmethod
    def default_params():
        """
        Default params for Mailgun request. This a method instead of an attribute to allow for the
        overriding of settings values.

        Returns:
            dict: A dict of default parameters for the Mailgun API
        """
        return {'from': settings.EMAIL_SUPPORT}

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
        email_params = cls.default_params()
        email_params.update(params)
        # Update 'from' address if sender_name was specified
        if sender_name is not None:
            email_params['from'] = "{sender_name} <{email}>".format(
                sender_name=sender_name,
                email=email_params['from']
            )
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
            tuple: A tuple of the (possibly) overridden recipients list and email body
        """
        if settings.MAILGUN_RECIPIENT_OVERRIDE is not None:
            body = '{0}\n\n[overridden recipient]\n{1}'.format(body, '\n'.join(recipients))
            recipients = [settings.MAILGUN_RECIPIENT_OVERRIDE]
        return body, recipients

    @classmethod
    def send_bcc(  # pylint: disable=too-many-arguments
            cls, subject, body, recipients, sender_name=None, raise_for_status=True,
    ):
        """
        Sends a text email to a BCC'ed list of recipients.

        Args:
            subject (str): Email subject
            body (str): Text email body
            recipients (list): A list of recipient emails
            sender_name (str): Sender name
            raise_for_status (bool): If true and response is not a 2xx status code, raise an exception
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
        response = cls._mailgun_request(
            requests.post,
            'messages',
            params,
            sender_name=sender_name,
        )
        if raise_for_status:
            response.raise_for_status()
        return response

    @classmethod
    def send_batch(cls, subject, body, recipients,  # pylint: disable=too-many-arguments
                   sender_address=None, sender_name=None, chunk_size=settings.MAILGUN_BATCH_CHUNK_SIZE):
        """
        Sends a text email to a list of recipients (one email per recipient) via batch.

        Args:
            subject (str): Email subject
            body (str): Text email body
            recipients (iterable): A list of recipient emails
            sender_address (str): Sender email address
            sender_name (str): Sender name
            chunk_size (int): The maximum amount of emails to be sent at the same time

        Returns:
            list:
                List of (recipients, requests.Response, exception) where
                recipients is a list of recipient emails,
                Response is an HTTP response from Mailgun, if there is one,
                exception is an exception which occurred when attempting to mail, if there is one
        """
        original_recipients = recipients
        body, recipients = cls._recipient_override(body, original_recipients)
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
            if sender_address:
                params['from'] = sender_address

            if settings.MAILGUN_RECIPIENT_OVERRIDE is not None:
                original_recipients_chunk = original_recipients
            else:
                original_recipients_chunk = chunk

            try:
                response = cls._mailgun_request(
                    requests.post,
                    'messages',
                    params,
                    sender_name=sender_name,
                )
                if response.status_code == status.HTTP_401_UNAUTHORIZED:
                    message = "Mailgun API keys not properly configured."
                    log.error(message)
                    raise ImproperlyConfigured(message)

                responses.append(
                    (original_recipients_chunk, response, None)
                )
            except Exception as exception:  # pylint: disable=broad-except
                responses.append(
                    (original_recipients_chunk, None, exception)
                )
            chunk = list(islice(recipients, chunk_size))

        return responses

    @classmethod
    def send_individual_email(cls, subject, body, recipient,  # pylint: disable=too-many-arguments
                              sender_address=None, sender_name=None, raise_for_status=True):
        """
        Sends a text email to a single recipient.

        Args:
            subject (str): email subject
            body (str): email body
            recipient (str): email recipient
            sender_address (str): Sender email address
            sender_name (str): Sender name
            raise_for_status (bool): If true and a non-zero response was received,

        Returns:
            requests.Response: response from Mailgun
        """
        # Since .send_batch() returns a list, we need to return the first in the list
        responses = cls.send_batch(subject, body, [recipient], sender_address=sender_address, sender_name=sender_name)
        _, response, exception = responses[0]
        if exception is not None:
            raise exception
        if raise_for_status:
            response.raise_for_status()
        return response

    @classmethod
    def send_financial_aid_email(  # pylint: disable=too-many-arguments
            cls, acting_user, financial_aid, subject, body, raise_for_status=True,
    ):
        """
        Sends a text email to a single recipient, specifically as part of the financial aid workflow. This bundles
        saving an audit trail for emails sent (to be implemented).

        Args:
            acting_user (User): the user who is initiating this request, for auditing purposes
            financial_aid (FinancialAid): the FinancialAid object this pertains to (recipient is pulled from here)
            subject (str): email subject
            body (str): email body
            raise_for_status (bool): If true and we received a non 2xx status code from Mailgun, raise an exception
        Returns:
            requests.Response: response from Mailgun
        """
        from_address = cls.default_params()['from']
        to_address = financial_aid.user.email
        response = cls.send_individual_email(subject, body, to_address, raise_for_status=raise_for_status)
        if response.status_code == status.HTTP_200_OK:
            FinancialAidEmailAudit.objects.create(
                acting_user=acting_user,
                financial_aid=financial_aid,
                to_email=to_address,
                from_email=from_address,
                email_subject=subject,
                email_body=body
            )
        return response

    @classmethod
    def send_course_team_email(  # pylint: disable=too-many-arguments
            cls, user, course, subject, body, raise_for_status=True,
    ):
        """
       Sends a text email from a user to a course team.

       Args:
            user (User): A User
            course (courses.models.Course): A Course
            subject (str): Email subject
            body (str): Email body
            raise_for_status (bool): If true and we received a non 2xx status code from Mailgun, raise an exception
        Returns:
            requests.Response: HTTP Response from Mailgun
       """
        if not course.contact_email:
            raise ImproperlyConfigured(
                'Course team contact email attempted for course without contact_email'
                '(id: {}, title: "{}")'.format(course.id, course.title)
            )
        response = cls.send_individual_email(
            subject,
            body,
            course.contact_email,
            sender_address=user.email,
            sender_name=user.profile.display_name,
            raise_for_status=raise_for_status,
        )
        return response
