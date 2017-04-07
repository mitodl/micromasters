"""
Provides functions for sending and retrieving data about in-app email
"""
import logging
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
from micromasters.utils import chunks
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
    def send_batch(cls, subject, body, recipients,  # pylint: disable=too-many-arguments, too-many-locals
                   sender_address=None, sender_name=None, chunk_size=settings.MAILGUN_BATCH_CHUNK_SIZE,
                   raise_for_status=True):
        """
        Sends a text email to a list of recipients (one email per recipient) via batch.

        Args:
            subject (str): Email subject
            body (str): Text email body
            recipients (iterable of (recipient, recipient_vars)):
                A list where each tuple is:
                    (recipient, recipient_vars)
                Where the recipient is an email address and recipient_vars is a dict of variables for templating
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

        if settings.MAILGUN_RECIPIENT_OVERRIDE is not None:
            # This is used for debugging only
            body = '{body}\n\n[overridden recipient]\n{recipient_data}'.format(
                body=body,
                recipient_data='\n'.join(
                    ["{}: {}".format(recipient, json.dumps(_vars)) for recipient, _vars in recipients]
                ),
            )
            recipients = [(settings.MAILGUN_RECIPIENT_OVERRIDE, None)]

        responses = []
        exception_pairs = []

        for chunk in chunks(recipients, chunk_size=chunk_size):
            params = {
                'to': [email for email, _vars in chunk],
                'subject': subject,
                'text': body,
                'recipient-variables': json.dumps({email: _vars or {} for email, _vars in chunk}),
            }
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
                    ([email for email, _vars in original_recipients_chunk], exception)
                )

        if len(exception_pairs) > 0:
            raise SendBatchException(exception_pairs)

        return responses

    @classmethod
    def send_individual_email(cls, subject, body, recipient,  # pylint: disable=too-many-arguments
                              recipient_variables=None,
                              sender_address=None, sender_name=None, raise_for_status=True):
        """
        Sends a text email to a single recipient.

        Args:
            subject (str): email subject
            body (str): email body
            recipient (str): email recipient
            recipient_variables (dict): A dict of template variables to use (may be None for empty)
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
            [(recipient, recipient_variables)],
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
                recipient_variables=list(get_mail_vars([user.email]))[0],
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


def add_automatic_email(original_search, email_subject, email_body, sender_name, staff_user):
    """
    Add an automatic email entry

    Args:
        original_search (Search):
            The original search, which contains all back end filtering but no filtering specific to mail
            or for percolated queries.
        email_subject (str): Subject for the email
        email_body (str): Body for the email
        sender_name (str): The name of the sender of the email
        staff_user (User): The staff user creating the email
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
            staff_user=staff_user,
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


def get_mail_vars(emails):
    """
    Returns a generator of mail template variables for each email in emails

    Args:
        emails (iterable of str): A list of email addresses

    Returns:
        generator of dict:
            A dictionary of template variables along with email so we can tell who is who
    """
    queryset = User.objects.filter(email__in=emails).values(
        'email',
        'profile__mail_id',
        'profile__preferred_name',
    )
    return (
        {
            'email': values['email'],
            'mail_id': values['profile__mail_id'].hex,
            'preferred_name': values['profile__preferred_name'],
        } for values in queryset
    )
