"""
Views for the Search app
"""

import logging

from django.conf import settings
from elasticsearch_dsl import Search, Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from roles.api import get_advance_searchable_programs
from search.api import (
    DOC_TYPES,
    get_conn
)

log = logging.getLogger(__name__)


class ElasticProxyView(APIView):
    """
    Elasticsearch proxy needed to enforce authentication and permissions
    """
    authentication_classes = (SessionAuthentication, )
    permission_classes = (IsAuthenticated, )

    def dispatch(self, request, *args, **kwargs):
        # import pdb
        # pdb.set_trace()
        return APIView.dispatch(self, request, *args, **kwargs)

    def _search_elasicsearch(self, request):
        """
        Common function that will take care of handling requests coming from different methods.
        """
        # make sure there is a live connection
        get_conn()

        # create a search object and load the query coming from the client
        search = Search(index=settings.ELASTICSEARCH_INDEX, doc_type=DOC_TYPES)
        search = search.from_dict(request.data)

        # extract all the programs where the user is allowed to search
        users_allowed_programs = get_advance_searchable_programs(request.user)
        # if the user cannot search any program, return an error
        if not users_allowed_programs:
            return Response(
                status=status.HTTP_403_FORBIDDEN,
                data={'error': 'no_available_programs'}
            )
        # no matter what the query is, limit the programs to the allowed ones
        # if this is a superset of what searchkit sends, this will not impact the result
        query_limit = Q(
            'nested',
            path="program",
            query=Q(
                'bool',
                should=[
                    Q('term', **{'program.id': program.id}) for program in users_allowed_programs
                ]
            ),
        )
        search = search.query(query_limit)
        # execute the query
        results = search.execute()
        # return the result as a dictionary
        return Response(
            results.to_dict()
        )

    def get(self, request, *args, **kwargs):
        """
        Handler for GET requests
        """
        return self._search_elasicsearch(request)

    def post(self, request, *args, **kwargs):
        """
        Handler for POST requests
        """
        return self._search_elasicsearch(request)
