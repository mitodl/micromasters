"""APIs for discussions"""
from urllib.parse import urljoin

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ImproperlyConfigured
from django.shortcuts import redirect
from rest_framework import status
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from discussions.exceptions import (
    ChannelAlreadyExistsException,
    UnableToAuthenticateDiscussionUserException,
)
from discussions.permissions import CanCreateChannel
from discussions.serializers import ChannelSerializer
from discussions.utils import get_token_for_request


def _set_jwt_cookie(response, token):
    """
    Set the token on the response

    Args:
        response (django.http.Response): the response to set the cookie on
        token (str): the JWT token
    """
    if not settings.OPEN_DISCUSSIONS_COOKIE_NAME:
        raise ImproperlyConfigured('OPEN_DISCUSSIONS_COOKIE_NAME must be set')
    response.set_cookie(
        settings.OPEN_DISCUSSIONS_COOKIE_NAME,
        token,
        max_age=settings.OPEN_DISCUSSIONS_JWT_EXPIRES_DELTA,
        domain=settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN,
        httponly=True
    )


@api_view()
def discussions_token(request):
    """
    API view for setting discussions JWT token
    """
    token = get_token_for_request(request)
    if token is not None:
        response = Response({
            'has_token': True
        })
        _set_jwt_cookie(response, token)
    else:
        response = Response({
            'has_token': False
        }, status=status.HTTP_403_FORBIDDEN)
    return response


@login_required
def discussions_redirect(request):
    """
    View for setting discussions JWT token and redirecting to discussions
    """
    token = get_token_for_request(request, force_create=True)

    if token is not None:
        response = redirect(urljoin(
            settings.OPEN_DISCUSSIONS_REDIRECT_URL, settings.OPEN_DISCUSSIONS_REDIRECT_COMPLETE_URL
        ))
        _set_jwt_cookie(response, token)
    else:
        raise UnableToAuthenticateDiscussionUserException("Unable to generate a JWT token for user")

    return response


class ChannelsView(APIView):
    """
    View for discussions channels. Used to create new channels
    """
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (
        IsAuthenticated,
        CanCreateChannel,
    )

    def post(self, request, *args, **kwargs):
        """Create a new channel"""
        serializer = ChannelSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except ChannelAlreadyExistsException:
            return Response(
                {"name": "A channel with that name already exists"},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )
