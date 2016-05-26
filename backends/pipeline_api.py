"""
APIs for extending the python social auth pipeline
"""
import logging
from datetime import datetime
from urllib.parse import urljoin

from backends.edxorg import EdxOrgOAuth2
from profiles.models import Profile
from profiles.util import split_name

log = logging.getLogger(__name__)


def update_profile_from_edx(backend, user, response, is_new, *args, **kwargs):   # pylint: disable=unused-argument
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
    if backend.name != EdxOrgOAuth2.name or not is_new:
        return

    access_token = response.get('access_token')
    if not access_token:
        # this should never happen for the edx oauth provider, but just in case...
        log.error('Missing access token for the user %s', user.username)
        return

    try:
        user_profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        # this should never happen, since the profile is created with a signal
        # right after the user is created
        log.error('No profile found for the user %s', user.username)
        return

    username = user.social_auth.get(provider=EdxOrgOAuth2.name).uid
    user_profile_edx = backend.get_json(
        urljoin(backend.EDXORG_BASE_URL, '/api/user/v1/accounts/{0}'.format(username)),
        headers={
            "Authorization": "Bearer {}".format(access_token),
        }
    )

    name = user_profile_edx.get('name', "")
    user_profile.edx_name = name
    user_profile.first_name, user_profile.last_name = split_name(name)
    user_profile.edx_bio = user_profile_edx.get('bio')
    user_profile.country = user_profile_edx.get('country')
    user_profile.has_profile_image = user_profile_edx.get(
        'profile_image', {}).get('has_image')
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

    user_profile.save()

    log.debug(
        'Profile for user "%s" updated with values from EDX %s',
        user.username,
        user_profile_edx
    )


def update_from_linkedin(backend, user, response, *args, **kwargs):   # pylint: disable=unused-argument
    """
    Gets profile information from LinkedIn and save it in the user profile

    Args:
        backend (social.backends.oauth.BaseOAuth2): the python social auth backend
        user (User): user object
        response (dict): dictionary of the user information coming
            from previous functions in the pipeline
        is_new (bool): whether the authenticated user created a new local instance

    Returns:
        None
    """

    # this function is completely skipped if the backend is not linkedin
    if backend.name != 'linkedin-oauth2':
        return

    try:
        user_profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        # this should never happen, since the profile is created with a signal
        # right after the user is created
        log.error('No profile found for the user %s', user.username)
        return

    user_profile.linkedin = response
    user_profile.save()


def set_last_update(details, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Pipeline function to add extra information about when the social auth
    profile has been updated.

    Args:
        details (dict): dictionary of informations about the user

    Returns:
        dict: updated details dictionary
    """
    details['updated_at'] = datetime.utcnow().timestamp()
    return details
