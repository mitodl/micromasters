"""
Views for email REST APIs
"""
import logging

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.urls import reverse
from rest_framework import (
    authentication,
    permissions,
    status,
)
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.mixins import UpdateModelMixin
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from rest_framework.response import Response

from courses.models import Course
from dashboard.models import ProgramEnrollment
from financialaid.models import FinancialAid
from financialaid.permissions import UserCanEditFinancialAid
from mail.api import (
    add_automatic_email,
    get_mail_vars,
    MailgunClient,
    mark_emails_as_sent,
)
from mail.exceptions import SendBatchException
from mail.permissions import (
    UserCanMessageCourseTeamPermission,
    UserCanMessageLearnersPermission,
    UserCanMessageSpecificLearnerPermission,
    MailGunWebHookPermission,
)
from mail.serializers import GenericMailSerializer, AutomaticEmailSerializer
from mail.utils import generate_mailgun_response_json, get_email_footer
from mail.models import AutomaticEmail, PartnerSchool
from profiles.models import Profile
from profiles.util import full_name
from search.api import (
    create_search_obj,
    get_all_query_matching_emails,
)

log = logging.getLogger(__name__)


class LearnerMailView(GenericAPIView):
    """
    View class that handles HTTP requests to learner mail API
    """
    serializer_class = GenericMailSerializer
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, UserCanMessageSpecificLearnerPermission, )
    lookup_field = "student_id"
    lookup_url_kwarg = "student_id"
    queryset = Profile.objects.all()

    def post(self, request, *args, **kargs):  # pylint: disable=unused-argument
        """
        POST method handler
        """
        sender_user = request.user
        recipient_user = self.get_object().user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mailgun_response = MailgunClient.send_individual_email(
            subject=request.data['email_subject'],
            body=request.data['email_body'],
            recipient=recipient_user.email,
            sender_address=sender_user.email,
            sender_name=sender_user.profile.display_name,
        )
        return Response(
            status=mailgun_response.status_code,
            data=generate_mailgun_response_json(mailgun_response)
        )


class AutomaticEmailView(ListAPIView, UpdateModelMixin, GenericViewSet):
    """
    View class that deals with listing and editing automatic mails
    """
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, UserCanMessageLearnersPermission, )
    serializer_class = AutomaticEmailSerializer
    lookup_field = "id"
    lookup_url_kwarg = "email_id"
    lookup_value_regex = r'[-\w.]+'

    def get_queryset(self):
        """Get the queryset which should be serialized"""
        return AutomaticEmail.objects.filter(staff_user=self.request.user)


def _make_batch_response_dict(response, exception):
    """
    Helper function to format a portion of a batch response
    """
    if exception is not None:
        return {
            "data": str(exception)
        }
    return {
        "status_code": response.status_code,
        "data": generate_mailgun_response_json(response),
    }


class SearchResultMailView(APIView):
    """
    View class that handles HTTP requests to search results mail API
    """
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, UserCanMessageLearnersPermission, )

    def post(self, request, *args, **kargs):  # pylint: disable=unused-argument
        """
        POST method handler
        """
        email_subject = request.data['email_subject']
        email_body = request.data['email_body'] + get_email_footer(request.build_absolute_uri('/settings'))
        sender_name = full_name(request.user)
        search_obj = create_search_obj(
            request.user,
            search_param_dict=request.data.get('search_request'),
            filter_on_email_optin=True
        )
        emails = get_all_query_matching_emails(search_obj)

        if request.data.get('send_automatic_emails'):
            automatic_email = add_automatic_email(
                search_obj,
                email_subject=request.data['email_subject'],
                email_body=email_body,
                sender_name=sender_name,
                staff_user=request.user,
            )

            try:
                with mark_emails_as_sent(automatic_email, emails) as user_ids:
                    # user_ids should be all users with the matching email in emails
                    # except some who were already sent email in the meantime
                    recipient_emails = list(User.objects.filter(id__in=user_ids).values_list('email', flat=True))
                    MailgunClient.send_batch(
                        subject=email_subject,
                        body=email_body,
                        recipients=((context['email'], context) for context in get_mail_vars(recipient_emails)),
                        sender_name=sender_name,
                    )
            except SendBatchException as send_batch_exception:
                success_emails = set(emails).difference(send_batch_exception.failed_recipient_emails)
                with mark_emails_as_sent(automatic_email, success_emails):
                    pass
                raise

        else:
            MailgunClient.send_batch(
                subject=email_subject,
                body=email_body,
                recipients=((context['email'], context) for context in get_mail_vars(emails)),
                sender_name=sender_name,
            )

        return Response(status=status.HTTP_200_OK, data={})


class CourseTeamMailView(GenericAPIView):
    """
    View class that handles HTTP requests to course team mail API
    """
    serializer_class = GenericMailSerializer
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, UserCanMessageCourseTeamPermission)
    lookup_field = "id"
    lookup_url_kwarg = "course_id"
    queryset = Course.objects.all()

    def post(self, request, *args, **kargs):  # pylint: disable=unused-argument
        """
        POST method handler
        """
        user = request.user
        course = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mailgun_response = MailgunClient.send_course_team_email(
            user=user,
            course=course,
            subject=serializer.data['email_subject'],
            body=serializer.data['email_body']
        )
        return Response(
            status=mailgun_response.status_code,
            data=generate_mailgun_response_json(mailgun_response)
        )


class FinancialAidMailView(GenericAPIView):
    """
    View for sending financial aid emails to individual learners
    """
    serializer_class = GenericMailSerializer
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, UserCanMessageLearnersPermission, UserCanEditFinancialAid)
    lookup_field = "id"
    lookup_url_kwarg = "financial_aid_id"
    queryset = FinancialAid.objects.all()

    def post(self, request, *args, **kwargs):
        """
        Post request to send emails to an individual learner
        """
        financial_aid = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mailgun_response = MailgunClient.send_financial_aid_email(
            body=serializer.data['email_body'],
            acting_user=request.user,
            subject=serializer.data['email_subject'],
            financial_aid=financial_aid
        )
        return Response(
            status=mailgun_response.status_code,
            data=generate_mailgun_response_json(mailgun_response)
        )


class GradesRecordMailView(GenericAPIView):
    """
    View for sending program grades emails to partner schools
    """
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, )
    lookup_field = "id"
    lookup_url_kwarg = "partner_id"
    queryset = PartnerSchool.objects.all()

    def post(self, request, *args, **kargs):  # pylint: disable=unused-argument
        """
        POST method handler
        """
        sender_user = request.user
        school = self.get_object()
        enrollment = get_object_or_404(ProgramEnrollment, hash=request.data['enrollment_hash'])
        mailgun_response = MailgunClient.send_individual_email(
            subject="MicroMasters Program Record",
            body=render_to_string(
                'grades_record_email.html',
                {
                    'user_full_name': sender_user.profile.full_name,
                    'pathway_name': school.name,
                    'program_name': enrollment.program.title,
                    'record_link': request.build_absolute_uri(
                        reverse('grade_records', args=[request.data['enrollment_hash']])
                    ),
                }),
            recipient=school.email,
            sender_address=sender_user.email,
            sender_name=sender_user.profile.display_name,
        )
        return Response(
            status=mailgun_response.status_code,
            data=generate_mailgun_response_json(mailgun_response)
        )


class MailWebhookView(APIView):
    """
    View class that handles Mailgun webhooks
    """
    permission_classes = (MailGunWebHookPermission, )

    def post(self, request, *args, **kargs):  # pylint: disable=unused-argument
        """
        POST method handler
        """
        event = request.POST.get("event", None)
        recipient = request.POST.get("recipient", None)
        error = request.POST.get("error", None)
        message_headers = request.POST.get("message-headers", None)
        log_error_on_bounce = request.POST.get("log_error_on_bounce", "")
        error_msg = (
            "Webhook event {event} received by Mailgun for recipient {to}: {error} {header}".format(
                to=recipient,
                error=error,
                event=event,
                header=message_headers
            )
        )

        if log_error_on_bounce.lower() == "true" and event == "bounced":
            log.error(error_msg)
        else:
            log.debug(error_msg)

        return Response(status=status.HTTP_200_OK)
