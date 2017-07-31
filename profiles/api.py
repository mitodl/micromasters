"""
Functions for profiles
"""
import logging

from django.core.exceptions import ObjectDoesNotExist

from backends.edxorg import EdxOrgOAuth2

log = logging.getLogger(__name__)


def get_social_auth(user):
    """
    returns social auth object for user

    Args:
         user (django.contrib.auth.models.User):  A Django user
    """
    return user.social_auth.filter(provider=EdxOrgOAuth2.name).latest('id')


def get_social_username(user):
    """
    Get social auth edX username for a user, or else return None.

    Args:
        user (django.contrib.auth.models.User):
            A Django user
    """
    if user.is_anonymous():
        return None

    try:
        return get_social_auth(user).uid
    except ObjectDoesNotExist:
        return None
    except Exception as ex:  # pylint: disable=broad-except
        log.error("Unexpected error retrieving social auth username: %s", ex)
        return None
