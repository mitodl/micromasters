"""
Functions for profiles
"""
import logging

from django.core.exceptions import ObjectDoesNotExist

from backends.constants import BACKEND_EDX_ORG

log = logging.getLogger(__name__)


def get_social_auth(user, provider=BACKEND_EDX_ORG):
    """
    Returns social auth object for user

    Args:
         user (django.contrib.auth.models.User):  A Django user
         provider (str): 'mitxonline' or 'edxorg'
    """
    return user.social_auth.get(provider=provider)


def get_social_username(user, provider=BACKEND_EDX_ORG):
    """
    Get social auth edX username for a user, or else return None.

    Args:
        provider:
        user (django.contrib.auth.models.User):
            A Django user
    """
    if user.is_anonymous:
        return None

    try:
        return get_social_auth(user, provider).uid
    except ObjectDoesNotExist:
        return None
    except Exception as ex:  # pylint: disable=broad-except
        log.error("Unexpected error retrieving social auth username: %s", ex)
        return None
