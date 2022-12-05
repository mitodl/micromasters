"""
EdX.org backend for Python Social Auth
"""
import abc
from urllib.parse import urljoin

from social_core.backends.oauth import BaseOAuth2
from edx_api.client import EdxApi

from micromasters.utils import now_in_utc


def edx_authorize_url(base_url):
    """
    Returns an edx authorize url from a base url.

    Args:
        base_url (str): the edx instance base url

    Returns:
        str: the authorize url
    """
    return urljoin(base_url, '/oauth2/authorize/')


def edx_access_token_url(base_url):
    """
    Returns an edx access token url from a base url.

    Args:
        base_url (str): the edx instance base url

    Returns:
        str: the access token url
    """
    return urljoin(base_url, '/oauth2/access_token/')


class BaseEdxOAuth2(abc.ABC, BaseOAuth2):
    """
    Base edx OAuth2 authentication backend
    """
    name = 'edxorg'
    ID_KEY = 'edx_id'
    REQUEST_TOKEN_URL = None
    EDXORG_CALLBACK_URL = None

    # Settings for Django OAUTH toolkit
    DEFAULT_SCOPE = ['read', 'write']

    ACCESS_TOKEN_METHOD = 'POST'
    REDIRECT_STATE = False
    EXTRA_DATA = [
        ('refresh_token', 'refresh_token', True),
        ('expires_in', 'expires_in'),
        ('token_type', 'token_type', True),
        ('scope', 'scope'),
    ]

    @classmethod
    def get_url(cls, path):
        """
        Get a full url given a relative path

        Args:
            path (str): the relative url path

        Returns:
            str: the full url
        """
        return urljoin(cls.EDXORG_CALLBACK_URL, path)

    def user_data(self, access_token, *args, **kwargs):
        """
        Loads user data from service.

        This is the function that has to pull the data from edx

        Args:
            access_token (str): the OAUTH access token

        Returns:
            dict: a dictionary containing user information
                coming from the remote service.
        """
        edx_client = EdxApi({'access_token': access_token}, self.EDXORG_CALLBACK_URL)
        info = edx_client.user_info.get_user_info()
        return {'name': info.name, 'username': info.username, 'email': info.email}

    def get_user_details(self, response):
        """
        Returns user details in a known internal struct.

        This is the function that, given the data coming from edx,
        formats the content to return a dictionary with the keys
        like the following one.

        Args:
            response (dict): dictionary containing user information
                coming from the remote service.

        Returns:
            dict: dictionary with a defined structure containing
                the following keys:
                <remote_id>, `username`, `email`, `fullname`, `first_name`, `last_name`
        """
        full, _, _ = self.get_user_names(response['name'])

        return {
            'edx_id': response['username'],
            'username': response['username'],
            'email': response['email'],
            'fullname': full,
            # the following are not necessary because they are used only inside the User object.
            'first_name': '',
            'last_name': '',
        }

    def get_user_id(self, details, response):
        """
        Return a unique ID for the current user, by default from server
        response.

        Args:
            details (dict): the user formatted info coming from `get_user_details`
            response (dict): the user raw info coming from `user_data`

        Returns:
            string: the unique identifier for the user in the remote service.
        """
        return details.get(self.ID_KEY)

    def refresh_token(self, token, *args, **kwargs):
        """
        Overridden method to add extra info during refresh token.

        Args:
            token (str): valid refresh token

        Returns:
            dict of information about the user
        """
        response = super().refresh_token(token, *args, **kwargs)
        response['updated_at'] = now_in_utc().timestamp()
        return response
