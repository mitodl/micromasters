"""
mitX Online backend for Python Social Auth
"""
from django.conf import settings
from backends.base import BaseEdxOAuth2, edx_authorize_url, edx_access_token_url


class MitxOnlineOAuth2(BaseEdxOAuth2):
    """
    mitX Online OAuth2 authentication backend
    """
    name = 'mitxonline'
    EDX_BASE_URL = settings.MITXONLINE_BASE_URL

    # Settings for Django OAUTH toolkit
    AUTHORIZATION_URL = edx_authorize_url(EDX_BASE_URL)
    ACCESS_TOKEN_URL = edx_access_token_url(EDX_BASE_URL)
