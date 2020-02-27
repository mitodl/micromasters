"""Common MicroMasters middleware"""
from django.conf import settings
from django import shortcuts
from django.utils.deprecation import MiddlewareMixin

from ui.utils import FeatureFlag


class QueryStringFeatureFlagMiddleware(MiddlewareMixin):
    """
    Extracts feature flags from the query string
    """

    @classmethod
    def get_flag_key(cls, suffix):
        """
        Determines the full key for a given feature flag suffix

        Args:
            suffix (str): suffix to append to the key prefix

        Returns:
            str: the full key value
        """
        return '{prefix}_FEATURE_{suffix}'.format(
            prefix=settings.MIDDLEWARE_FEATURE_FLAG_QS_PREFIX,
            suffix=suffix,
        )

    @classmethod
    def encode_feature_flags(cls, data):
        """
        Encodes the set of feature flags from the request by creating a bit mask

        Args:
            data (dict): request query dict

        Returns:
            str: value encoded as a str
        """
        mask = 0
        if data is None:
            return str(mask)

        for member in FeatureFlag:
            if cls.get_flag_key(member.name) in data:
                mask = mask | member.value
        return str(mask)

    def process_request(self, request):
        """
        Processes an individual request for the feature flag query parameters

        Args:
            request (django.http.request.Request): the request to inspect
        """
        prefix = self.get_flag_key('')
        if request.GET and any(key.startswith(prefix) for key in request.GET.keys()):
            response = shortcuts.redirect(request.path)
            if self.get_flag_key('CLEAR') in request.GET:
                response.delete_cookie(settings.MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME)
            else:
                response.set_signed_cookie(
                    settings.MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME,
                    self.encode_feature_flags(request.GET),
                    max_age=settings.MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS,
                    httponly=True,
                )
            return response

        return None


class CookieFeatureFlagMiddleware(MiddlewareMixin):
    """
    Extracts feature flags from a cookie
    """

    @classmethod
    def decode_feature_flags(cls, value):
        """
        Decodes a set of feature flags from a bitmask value

        Args:
            value (int): the bitmask value

        Returns:
            set: the set of feature values in the value
        """
        return set(member for member in FeatureFlag if member.value & value)

    @classmethod
    def get_feature_flags(cls, request):
        """
        Determines the set of features enabled on a request via cookie

        Args:
            request (django.http.request.Request): the request to inspect

        Returns:
            set: the set of FeatureFlag values set in the cookie if present
        """
        if settings.MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME in request.COOKIES:
            try:
                value = int(request.get_signed_cookie(settings.MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME))
            except ValueError:
                return set()
            return cls.decode_feature_flags(value)
        else:
            return set()

    def process_request(self, request):  # pylint: disable=useless-return
        """
        Processes an individual request for the feature flag cookie

        Args:
            request (django.http.request.Request): the request to inspect
        """
        request.mm_feature_flags = self.get_feature_flags(request)
        return None
