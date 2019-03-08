"""Discussions utils"""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from open_discussions_api import utils

from discussions import api
from discussions.models import DiscussionUser

from mail import api as mail_api


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


def email_mm_admin_about_stale_memberships(membership_ids):
    """
    Email list of stale memberships to mm admin

    Args:
        membership_ids(List): List of ids
    """
    if getattr(settings, 'ADMIN_EMAIL', None) is None:
        raise ImproperlyConfigured('Setting ADMIN_EMAIL is not set')

    subject = "List of stale memberships"
    body = (
        "Hi,\n"
        "The following memberships were stale in the PercolateQueryMembership:\n\n"
        "{membership_ids}"
    ).format(
        membership_ids=membership_ids,
    )

    mail_api.MailgunClient().send_individual_email(
        subject,
        body,
        settings.ADMIN_EMAIL
    )
