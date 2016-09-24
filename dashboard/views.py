"""
Views for dashboard REST APIs
"""
import logging

from django.conf import settings
from rest_framework import (
    authentication,
    permissions,
)
from rest_framework.views import APIView
from rest_framework.response import Response

from edx_api.client import EdxApi

from backends import utils
from backends.edxorg import EdxOrgOAuth2

from courses.models import (
    Program,
)
from dashboard.api import (
    get_formatted_program,
    get_student_certificates,
    get_student_current_grades,
    get_student_enrollments,
)


log = logging.getLogger(__name__)


class UserDashboard(APIView):
    """
    Class based view for user dashboard view.
    """
    authentication_classes = (authentication.SessionAuthentication, )
    permission_classes = (permissions.IsAuthenticated, )

    def get(self, request, *args, **kargs):  # pylint: disable=unused-argument, no-self-use
        """
        Returns information needed to display the user dashboard for a program.
        """

        # get the credentials for the current user for edX
        user_social = request.user.social_auth.get(provider=EdxOrgOAuth2.name)
        try:
            utils.refresh_user_token(user_social)
        except utils.InvalidCredentialStored as exc:
            return Response(
                status=exc.http_status_code,
                data={'error': str(exc)}
            )

        # create an instance of the client to query edX
        edx_client = EdxApi(user_social.extra_data, settings.EDXORG_BASE_URL)
        # get enrollments for the student
        enrollments = get_student_enrollments(request.user, edx_client)
        # get certificates for the student
        certificates = get_student_certificates(request.user, edx_client)
        # get current_grades for the student
        current_grades = get_student_current_grades(request.user, edx_client)  # pylint: disable=unused-variable

        response_data = []
        for program in Program.objects.filter(live=True):
            response_data.append(get_formatted_program(program, enrollments, certificates))
        return Response(response_data)
