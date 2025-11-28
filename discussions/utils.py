"""Discussions utils"""
import time

import jwt as pyjwt
from django.conf import settings

from discussions import api
from discussions.models import DiscussionUser
from roles.models import Role
from roles.roles import Permissions


def _build_discussion_payload(username, roles, expires_delta, extra_payload):
    """Build the JWT payload for discussions."""
    now = int(time.time())
    payload = {
        'username': username,
        'roles': roles,
        'exp': now + expires_delta,
        'orig_iat': now,
    }
    if extra_payload:
        payload.update(extra_payload)
    return payload


def _generate_discussion_token(username, roles, expires_delta, extra_payload):
    """Return a PyJWT-encoded discussion token (str under PyJWT>=2)."""
    payload = _build_discussion_payload(username, roles, expires_delta, extra_payload)
    return pyjwt.encode(payload, settings.OPEN_DISCUSSIONS_JWT_SECRET, algorithm='HS256')


def get_token_for_user(user, force_create=False):
    """
    Generates a token for the given user

    Args:
        user (django.contrib.auth.models.User): the user to generate a token for
        auth_url (str): urls to reauthenticate the user
        session_url (str): url to renew the user session at
        force_create (bool): force creation of the discussion user if it doesn't exist

    Returns:
        str: the token or None
    """
    if user.is_anonymous:
        return None

    try:
        discussion_user = user.discussion_user
    except DiscussionUser.DoesNotExist:
        discussion_user = None  # we may try to force_create this, so don't return just yet

    # force creation or refresh of a DiscussionUser so we can generate a token
    if force_create:
        discussion_user = api.create_or_update_discussion_user(user.id)

    if discussion_user is not None and discussion_user.username is not None:
        return _generate_discussion_token(
            user.username,
            [],  # no roles for learners,
            expires_delta=settings.OPEN_DISCUSSIONS_JWT_EXPIRES_DELTA,
            extra_payload={
                'site_key': settings.OPEN_DISCUSSIONS_SITE_KEY,
                'provider': 'micromasters',
            },
        )

    return None


def get_token_for_request(request, force_create=False):
    """
    Gets a token for a given request

    Args:
        request (django.http.HttpRequest): the django request
        force_create (bool): force creation of the discussion user if it doesn't exist

    Returns:
        str: the token or None
    """
    return get_token_for_user(request.user, force_create=force_create)


def get_moderators_for_channel(channel_name):
    """ Return moderator ids against a given channel name."""
    return Role.objects.filter(
        role__in=Role.permission_to_roles[Permissions.CAN_CREATE_FORUMS],
        program__channelprogram__channel__name=channel_name,
    ).values_list('user', flat=True)
