"""Discussions utils"""
from django.conf import settings
from django.urls import reverse
from open_discussions_api import utils

from discussions import api
from discussions.models import DiscussionUser


def get_token_for_user(user, auth_url=None, session_url=None, force_create=False):
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
            discussion_user.username,
            [],  # no roles for learners,
            expires_delta=settings.OPEN_DISCUSSIONS_JWT_EXPIRES_DELTA,
            extra_payload=dict(auth_url=auth_url, session_url=session_url)
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
    return get_token_for_user(
        request.user,
        auth_url=request.build_absolute_uri(reverse('discussions')),  # this will redirect to login
        session_url=request.build_absolute_uri(reverse('discussions_token')),
        force_create=force_create
    )
