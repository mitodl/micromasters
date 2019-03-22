"""Discussions utils"""
from django.conf import settings
from open_discussions_api import utils

from discussions import api
from discussions.models import DiscussionUser
from roles.models import Role
from roles.roles import Permissions


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

    discussion_user = None

    try:
        discussion_user = user.discussion_user
    except DiscussionUser.DoesNotExist:
        pass  # we may try to force_create this, so don't return just yet

    # force creation of a DiscussionUser so we can generate a token
    if force_create and (discussion_user is None or discussion_user.username is None):
        discussion_user = api.create_or_update_discussion_user(user.id)

    if discussion_user is not None and discussion_user.username is not None:
        return utils.get_token(
            settings.OPEN_DISCUSSIONS_JWT_SECRET,
            user.username,
            [],  # no roles for learners,
            expires_delta=settings.OPEN_DISCUSSIONS_JWT_EXPIRES_DELTA,
            extra_payload={
                'site_key': settings.OPEN_DISCUSSIONS_SITE_KEY,
                'provider': 'micromasters',
            }
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
