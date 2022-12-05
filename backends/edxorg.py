"""
EdX.org backend for Python Social Auth
"""
from django.conf import settings
from backends.base import BaseEdxOAuth2, edx_authorize_url, edx_access_token_url


class EdxOrgOAuth2(BaseEdxOAuth2):
    """
    EDX.org OAuth2 authentication backend
    """
    name = 'edxorg'
    EDX_BASE_URL = settings.EDXORG_BASE_URL
    EDX_CALLBACK_URL = settings.EDX_CALLBACK_URL

    # Settings for Django OAUTH toolkit
    AUTHORIZATION_URL = edx_authorize_url(EDX_CALLBACK_URL)
    ACCESS_TOKEN_URL = edx_access_token_url(EDX_BASE_URL)
