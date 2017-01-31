"""
Views for dashboard REST APIs
"""
import logging

from django.conf import settings
from edx_api.client import EdxApi
from requests.exceptions import HTTPError
from rest_framework import (
    authentication,
    permissions,
    status,
)
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response

from backends import utils
from backends.edxorg import EdxOrgOAuth2
from dashboard.api import get_user_program_info
from dashboard.api_edx_cache import CachedEdxDataApi
from micromasters.exceptions import PossiblyImproperlyConfigured
from profiles.api import get_social_username


log = logging.getLogger(__name__)


class UserDashboard(APIView):
    """
    Class based view for user dashboard view.
    """
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, )

    def get(self, request, *args, **kargs):  # pylint: disable=unused-argument
        """
        Returns information needed to display the user
        dashboard for all the programs the user is enrolled in.
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
        return Response(get_user_program_info(request.user, edx_client))


class UserCourseEnrollment(APIView):
    """
    Create an audit enrollment for the user in a given course run identified by course_id.
    """
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, )

    def post(self, request):
        """
        Audit enrolls the user in a course in edx
        """
        course_id = request.data.get('course_id')
        if course_id is None:
            raise ValidationError('course id missing in the request')
        # get the credentials for the current user for edX
        user_social = request.user.social_auth.get(provider=EdxOrgOAuth2.name)
        try:
            utils.refresh_user_token(user_social)
        except utils.InvalidCredentialStored as exc:
            log.error(
                "Error while refreshing credentials for user %s",
                get_social_username(request.user),
            )
            return Response(
                status=exc.http_status_code,
                data={'error': str(exc)}
            )

        # create an instance of the client to query edX
        edx_client = EdxApi(user_social.extra_data, settings.EDXORG_BASE_URL)

        try:
            enrollment = edx_client.enrollments.create_audit_student_enrollment(course_id)
        except HTTPError as exc:
            if exc.response.status_code == status.HTTP_400_BAD_REQUEST:
                raise PossiblyImproperlyConfigured(
                    'Got a 400 status code from edX server while trying to create '
                    'audit enrollment. This might happen if the course is improperly '
                    'configured on MicroMasters. Course key '
                    '{course_key}, edX user "{edX_user}"'.format(
                        edX_user=get_social_username(request.user),
                        course_key=course_id,
                    )
                )
            log.error(
                "Http error from edX while creating audit enrollment for course key %s for edX user %s",
                course_id,
                get_social_username(request.user),
            )
            return Response(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data={'error': str(exc)}
            )
        except Exception as exc:  # pylint: disable=broad-except
            log.exception(
                "Error creating audit enrollment for course key %s for edX user %s",
                course_id,
                get_social_username(request.user),
            )
            return Response(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data={'error': str(exc)}
            )
        CachedEdxDataApi.update_cached_enrollment(request.user, enrollment, enrollment.course_id, index_user=True)
        return Response(
            data=enrollment.json
        )
