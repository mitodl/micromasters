"""
EdX.org backend for Python Social Auth
"""
from django.conf import settings

from backends.base import (BaseEdxOAuth2, edx_access_token_url,
                           edx_authorize_url)


class EdxOrgOAuth2(BaseEdxOAuth2):
    """
    EDX.org OAuth2 authentication backend
    """

    name = "edxorg"
    AUTH_BASE_URL = settings.EDXORG_BASE_URL
    AUTH_CALLBACK_URL = settings.EDXORG_CALLBACK_URL

    # Settings for Django OAUTH toolkit
    AUTHORIZATION_URL = edx_authorize_url(AUTH_BASE_URL)
    ACCESS_TOKEN_URL = edx_access_token_url(AUTH_CALLBACK_URL)
