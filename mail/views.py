"""
Views for email REST APIs
"""
import logging

from rest_framework import (
    authentication,
    permissions,
    status,
)
from rest_framework.generics import GenericAPIView
from rest_framework.views import APIView
from rest_framework.response import Response

from financialaid.models import FinancialAid
from financialaid.permissions import UserCanEditFinancialAid
from search.api import (
    prepare_and_execute_search,
    get_all_query_matching_emails
)
from mail.api import MailgunClient
from mail.permissions import UserCanMessageLearnersPermission


log = logging.getLogger(__name__)


class SearchResultMailView(APIView):
    """
    View class that authenticates and handles HTTP requests to mail API URLs
    """
    authentication_classes = (authentication.SessionAuthentication, )
    permission_classes = (permissions.IsAuthenticated, UserCanMessageLearnersPermission, )

    def post(self, request, *args, **kargs):  # pylint: disable=unused-argument, no-self-use
        """
        View  to send emails to users
        """
        emails = prepare_and_execute_search(
            request.user,
            search_param_dict=request.data.get('search_request'),
            search_func=get_all_query_matching_emails
        )
        mailgun_responses = MailgunClient.send_batch(
            subject=request.data['email_subject'],
            body=request.data['email_body'],
            recipients=emails
        )
        return Response(
            status=status.HTTP_200_OK,
            data={
                "batch_{}".format(batch_num): {
                    "status_code": resp.status_code,
                    "data": resp.json()
                } for batch_num, resp in enumerate(mailgun_responses)
            }
        )


class FinancialAidMailView(GenericAPIView):
    """
    View for sending financial aid emails to individual learners
    """
    authentication_classes = (authentication.SessionAuthentication, )
    permission_classes = (permissions.IsAuthenticated, UserCanMessageLearnersPermission, UserCanEditFinancialAid)
    lookup_field = "id"
    lookup_url_kwarg = "financial_aid_id"
    queryset = FinancialAid.objects.all()

    def post(self, request, *args, **kwargs):
        """
        Post request to send emails to an individual learner
        """
        financial_aid = self.get_object()
        mailgun_response = MailgunClient.send_financial_aid_email(
            acting_user=request.user,
            financial_aid=financial_aid,
            subject=request.data['email_subject'],
            body=request.data['email_body']
        )
        return Response(data=mailgun_response.json(), status=mailgun_response.status_code)
