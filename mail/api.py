"""
Provides functions for sending and retrieving data about in-app email
"""
from itertools import islice
import json
import requests

from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework.status import HTTP_200_OK

from dashboard.models import ProgramEnrollment
from financialaid.api import get_formatted_course_price
from financialaid.constants import (
    FINANCIAL_AID_APPROVAL_SUBJECT,
    FINANCIAL_AID_APPROVAL_MESSAGE,
    FINANCIAL_AID_DOCUMENTS_RECEIVED_MESSAGE,
    FINANCIAL_AID_DOCUMENTS_RECEIVED_SUBJECT,
    FINANCIAL_AID_EMAIL_BODY
)
from financialaid.models import FinancialAidStatus
from mail.models import FinancialAidEmailAudit


class MailgunClient:
    """
    Provides functions for communicating with the Mailgun REST API.
    """
    _basic_auth_credentials = ('api', settings.MAILGUN_KEY)

    @staticmethod
    def get_base_params():
        """
        Base params for Mailgun request. This a method instead of an attribute to allow for overrides.
        """
        return {'from': settings.MAILGUN_FROM_EMAIL}

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
        email_params = params.copy()
        email_params.update(cls.get_base_params())
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


def generate_financial_aid_email(financial_aid):
    """
    Generates the email subject and body for a FinancialAid status update. Accepted statuses are
    FinancialAidStatus.APPROVED/FinancialAidStatus.REJECTED (the same email is sent for both statuses)
    and FinancialAidStatus.PENDING_MANUAL_APPROVAL (documents have been received).
    Args:
        financial_aid (FinancialAid): The FinancialAid object in question
    Returns:
        dict: {"subject": (str), "body": (str)}
    """
    if financial_aid.status in [FinancialAidStatus.APPROVED, FinancialAidStatus.REJECTED]:
        program_enrollment = ProgramEnrollment.objects.get(
            user=financial_aid.user,
            program=financial_aid.tier_program.program
        )
        message = FINANCIAL_AID_APPROVAL_MESSAGE.format(
            program_name=financial_aid.tier_program.program.title,
            price=get_formatted_course_price(program_enrollment)["price"]
        )
        subject = FINANCIAL_AID_APPROVAL_SUBJECT.format(program_name=financial_aid.tier_program.program.title)
    elif financial_aid.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL:
        message = FINANCIAL_AID_DOCUMENTS_RECEIVED_MESSAGE
        subject = FINANCIAL_AID_DOCUMENTS_RECEIVED_SUBJECT.format(
            program_name=financial_aid.tier_program.program.title
        )
    else:
        raise ValidationError("Invalid status on FinancialAid for generate_financial_aid_email()")
    body = FINANCIAL_AID_EMAIL_BODY.format(
        first_name=financial_aid.user.profile.first_name,
        message=message,
        program_name=financial_aid.tier_program.program.title
    )
    return {"subject": subject, "body": body}
