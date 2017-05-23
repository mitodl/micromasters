"""
Utility functions for the backends
"""
from datetime import datetime, timedelta
import pytz

from requests.exceptions import HTTPError
from social_django.utils import load_strategy

from backends.exceptions import InvalidCredentialStored
from micromasters.utils import now_in_utc


def _send_refresh_request(user_social):
    """
    Private function that refresh an user access token
    """
    strategy = load_strategy()
    try:
        user_social.refresh_token(strategy)
    except HTTPError as exc:
        if exc.response.status_code in (400, 401,):
            raise InvalidCredentialStored(
                message='Received a {} status code from the OAUTH server'.format(
                    exc.response.status_code),
                http_status_code=exc.response.status_code
            )
        raise


def refresh_user_token(user_social):
    """
    Utility function to refresh the access token if is (almost) expired

    Args:
        user_social (UserSocialAuth): a user social auth instance
    """
    try:
        last_update = datetime.fromtimestamp(user_social.extra_data.get('updated_at'), tz=pytz.UTC)
        expires_in = timedelta(seconds=user_social.extra_data.get('expires_in'))
    except TypeError:
        _send_refresh_request(user_social)
        return
    # small error margin of 5 minutes to be safe
    error_margin = timedelta(minutes=5)
    if now_in_utc() - last_update >= expires_in - error_margin:
        _send_refresh_request(user_social)
