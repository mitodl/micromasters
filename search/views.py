"""
Views for the Search app
"""

import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from search.permissions import UserCanSearchPermission
from search.api import prepare_and_execute_search
from search.exceptions import NoProgramAccessException


log = logging.getLogger(__name__)


class ElasticProxyView(APIView):
    """
    Elasticsearch proxy needed to enforce authentication and permissions
    """
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated, UserCanSearchPermission, )

    def _execute_search_from_request(self, request):  # pylint: disable=no-self-use
        """
        Common function that will take care of handling requests coming from different methods.
        """
        try:
            results = prepare_and_execute_search(request.user, search_param_dict=request.data)
        except NoProgramAccessException:
            return Response(
                status=status.HTTP_403_FORBIDDEN,
                data={'detail': 'You do not have access to this search.'}
            )
        return Response(
            results.to_dict()
        )

    def get(self, request, *args, **kwargs):
        """
        Handler for GET requests
        """
        return self._execute_search_from_request(request)

    def post(self, request, *args, **kwargs):
        """
        Handler for POST requests
        """
        return self._execute_search_from_request(request)
