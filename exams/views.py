"""
Views for exams app
"""

from urllib.parse import quote_plus
from django.views.generic.base import RedirectView
from django.core.exceptions import ImproperlyConfigured
from rest_framework import (
    authentication,
    permissions,
    status,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from exams.api import sso_digest
from exams.models import ExamProfile
from micromasters.utils import now_in_utc


class PearsonCallbackRedirectView(RedirectView):
    """
    Redirect from Pearson callbacks to dashboard
    """
    def get_redirect_url(self, status_code):  # pylint: disable=arguments-differ
        return "/dashboard?exam={status_code}".format(status_code=quote_plus(status_code))


class PearsonSSO(APIView):
    """
    Views for the Pearson SSO API
    """
    authentication_classes = (
        authentication.SessionAuthentication,
        authentication.TokenAuthentication,
    )
    permission_classes = (permissions.IsAuthenticated, )

    def get(self, request, *args, **kargs):  # pylint: disable=unused-argument, no-self-use
        """
        Request for exam SSO parameters
        """
        profile = request.user.profile
        student_id = profile.student_id

        if not ExamProfile.objects.filter(
                profile=profile,
                status=ExamProfile.PROFILE_SUCCESS,
        ).exists():
            # UI should in theory not send a user here in this state,
            # but it's not impossible so let's handle it politely
            return Response(data={
                'error': 'You are not ready to schedule an exam at this time',
            }, status=status.HTTP_403_FORBIDDEN)

        timestamp = int(now_in_utc().timestamp())
        session_timeout = request.session.get_expiry_age()

        try:
            digest = sso_digest(student_id, timestamp, session_timeout)
        except ImproperlyConfigured:
            return Response(status=500)

        return Response(data={
            'sso_digest': digest,
            'timestamp': timestamp,
            'session_timeout': session_timeout,
            'sso_redirect_url': request.build_absolute_uri('/'),
        })
