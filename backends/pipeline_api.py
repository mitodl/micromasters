"""
APIs for extending the python social auth pipeline
"""
import logging
from urllib.parse import urljoin

from django.shortcuts import redirect
from rolepermissions.checkers import has_role
from social_core.exceptions import AuthException

from backends.edxorg import EdxOrgOAuth2
from micromasters.utils import now_in_utc
from profiles.models import Profile
from profiles.util import split_name
from roles.models import (
    Instructor,
    Staff,
)

log = logging.getLogger(__name__)


def update_profile_from_edx(backend, user, response, is_new, *args, **kwargs):
    # pylint: disable=unused-argument
    """
    Gets profile information from EDX and saves them in the user profile

    Args:
        backend (social.backends.oauth.BaseOAuth2): the python social auth backend
        user (User): user object
        response (dict): dictionary of the user information coming
            from previous functions in the pipeline
        is_new (bool): whether the authenticated user created a new local instance

    Returns:
        None
    """
    # this function is completely skipped if the backend is not edx or
    # the user has not created now
    if backend.name != EdxOrgOAuth2.name:
        return

    if has_role(user, [Staff.ROLE_ID, Instructor.ROLE_ID]):
        next_relative_url = "/learners"
    else:
        next_relative_url = "/dashboard"

    next_url = backend.strategy.session.load().get('next') or backend.strategy.session.get('next')
    if not next_url:
        next_url = next_relative_url

    backend.strategy.session_set('next', next_url)

    user_profile_edx = kwargs.get('edx_profile')
    update_email(user_profile_edx, user)
    if not is_new:
        return

    try:
        user_profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        # this should never happen, since the profile is created with a signal
        # right after the user is created
        log.error('No profile found for the user %s', user.username)
        return

    name = user_profile_edx.get('name', "")
    user_profile.edx_name = name
    user_profile.first_name, user_profile.last_name = split_name(name)
    user_profile.preferred_name = name
    user_profile.edx_bio = user_profile_edx.get('bio')
    user_profile.country = user_profile_edx.get('country')
    user_profile.edx_requires_parental_consent = user_profile_edx.get('requires_parental_consent')
    user_profile.edx_level_of_education = user_profile_edx.get('level_of_education')
    user_profile.edx_goals = user_profile_edx.get('goals')
    user_profile.edx_language_proficiencies = user_profile_edx.get('language_proficiencies')
    try:
        user_profile.preferred_language = user_profile.edx_language_proficiencies[0]['code']
    except (IndexError, ValueError, KeyError, TypeError):
        pass
    user_profile.gender = user_profile_edx.get('gender')
    user_profile.edx_mailing_address = user_profile_edx.get('mailing_address')
    user_profile.agreed_to_terms_of_service = True

    user_profile.save()

    log.debug(
        'Profile for user "%s" updated with values from EDX %s',
        user.username,
        user_profile_edx
    )


def check_edx_verified_email(backend, response, details, *args, **kwargs):  # pylint: disable=unused-argument
    """Get account information to check if email was verified for account on edX"""
    if backend.name != EdxOrgOAuth2.name:
        return {}

    username = details.get('username')
    access_token = response.get('access_token')
    if not access_token:
        # this should never happen for the edx oauth provider, but just in case...
        raise AuthException('Missing access token for the edX user {0}'.format(username))

    user_profile_edx = backend.get_json(
        urljoin(backend.EDXORG_BASE_URL, '/api/user/v1/accounts/{0}'.format(username)),
        headers={
            "Authorization": "Bearer {}".format(access_token),
        }
    )

    if not user_profile_edx.get('is_active'):
        return redirect('verify-email')

    return {'edx_profile': user_profile_edx}


def set_last_update(details, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Pipeline function to add extra information about when the social auth
    profile has been updated.

    Args:
        details (dict): dictionary of informations about the user

    Returns:
        dict: updated details dictionary
    """
    details['updated_at'] = now_in_utc().timestamp()
    return details


def update_email(user_profile_edx, user):
    """
    updates email address of user
    Args:
        user_profile_edx (dict): user details from edX
        user (User): user object
    """
    user.email = user_profile_edx.get('email')
    user.save()
