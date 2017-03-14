"""
Provides functions for sending and retrieving data about in-app email
"""
import logging
from itertools import islice
import json
import requests

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.utils import IntegrityError
from rest_framework import status

from mail.exceptions import SendBatchException
from mail.models import (
    AutomaticEmail,
    FinancialAidEmailAudit,
    SentAutomaticEmail,
)
from search.api import (
    adjust_search_for_percolator,
    search_percolate_queries,
)
from search.models import PercolateQuery


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
    def _mailgun_request(  # pylint: disable=too-many-arguments
            cls, request_func, endpoint, params, sender_name=None, raise_for_status=True
    ):
        """
        Sends a request to the Mailgun API

        Args:
            request_func (function): requests library HTTP function (get/post/etc.)
            endpoint (str): Mailgun endpoint (eg: 'messages', 'events')
            params (dict): Dict of params to add to the request as 'data'
            raise_for_status (bool): If true, check the status and raise for non-2xx statuses
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
        response = request_func(
            mailgun_url,
            auth=cls._basic_auth_credentials,
            data=email_params
        )
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            message = "Mailgun API keys not properly configured."
            log.error(message)
            raise ImproperlyConfigured(message)
        if raise_for_status:
            response.raise_for_status()
        return response

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
    def send_batch(cls, subject, body, recipients,  # pylint: disable=too-many-arguments, too-many-locals
                   sender_address=None, sender_name=None, chunk_size=settings.MAILGUN_BATCH_CHUNK_SIZE,
                   raise_for_status=True):
        """
        Sends a text email to a list of recipients (one email per recipient) via batch.

        Args:
            subject (str): Email subject
            body (str): Text email body
            recipients (iterable): A list of recipient emails
            sender_address (str): Sender email address
            sender_name (str): Sender name
            chunk_size (int): The maximum amount of emails to be sent at the same time
            raise_for_status (bool): If true, raise for non 2xx statuses

        Returns:
            list:
                List of responses which are HTTP responses from Mailgun.

        Raises:
            SendBatchException:
               If there is at least one exception, this exception is raised with all other exceptions in a list
               along with recipients we failed to send to.
        """
        original_recipients = recipients
        body, recipients = cls._recipient_override(body, original_recipients)
        responses = []
        exception_pairs = []

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
                    raise_for_status=raise_for_status,
                )

                responses.append(response)
            except ImproperlyConfigured:
                raise
            except Exception as exception:  # pylint: disable=broad-except
                exception_pairs.append(
                    (original_recipients_chunk, exception)
                )
            chunk = list(islice(recipients, chunk_size))

        if len(exception_pairs) > 0:
            raise SendBatchException(exception_pairs)

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
        responses = cls.send_batch(
            subject,
            body,
            [recipient],
            sender_address=sender_address,
            sender_name=sender_name,
            raise_for_status=raise_for_status,
        )
        return responses[0]

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
        if response.ok:
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


def send_automatic_emails(program_enrollment):
    """
    Send all automatic emails which match the search criteria for a program enrollment

    Args:
        program_enrollment (ProgramEnrollment): A ProgramEnrollment
    """
    percolate_queries = search_percolate_queries(program_enrollment.id)
    automatic_emails = AutomaticEmail.objects.filter(
        query__in=percolate_queries,
        enabled=True,
    ).exclude(sentautomaticemail__user__programenrollment=program_enrollment)
    user = program_enrollment.user
    for automatic_email in automatic_emails:
        try:
            MailgunClient.send_individual_email(
                automatic_email.email_subject,
                automatic_email.email_body,
                user.email,
                sender_name=automatic_email.sender_name,
            )
            SentAutomaticEmail.objects.create(
                user=user,
                automatic_email=automatic_email,
            )
        except IntegrityError:
            log.exception("IntegrityError: SentAutomaticEmail was likely already created")
        except:  # pylint: disable=bare-except
            log.exception("Error sending mailgun mail for automatic email %s", automatic_email)


def add_automatic_email(original_search, email_subject, email_body, sender_name):
    """
    Add an automatic email entry

    Args:
        original_search (Search):
            The original search, which contains all back end filtering but no filtering specific to mail
            or for percolated queries.
        email_subject (str): Subject for the email
        email_body (str): Body for the email
        sender_name (str): The name of the sender of the email
    """
    updated_search = adjust_search_for_percolator(original_search)
    with transaction.atomic():
        percolate_query = PercolateQuery.objects.create(
            original_query=original_search.to_dict(),
            query=updated_search.to_dict(),
        )
        return AutomaticEmail.objects.create(
            query=percolate_query,
            enabled=True,
            email_subject=email_subject,
            email_body=email_body,
            sender_name=sender_name,
        )


@transaction.atomic
def mark_emails_as_sent(automatic_email, emails):
    """
    Mark users who have the given emails as sent

    Args:
        automatic_email (AutomaticEmail): An instance of AutomaticEmail
        emails (iterable): An iterable of emails
    """
    users = User.objects.filter(email__in=emails)
    for user in users:
        SentAutomaticEmail.objects.get_or_create(
            user=user,
            automatic_email=automatic_email,
        )
