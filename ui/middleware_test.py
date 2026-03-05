"""Unit tests for ui middleware"""
from unittest.mock import Mock, patch

import ddt
from django.test import TestCase, override_settings

from ui.middleware import (CookieFeatureFlagMiddleware,
                           QueryStringFeatureFlagMiddleware)
from ui.utils import FeatureFlag

FEATURE_FLAG_COOKIE_NAME = 'TEST_COOKIE'
FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS = 60


# pylint: disable=missing-docstring
@ddt.ddt
@override_settings(
    MIDDLEWARE_FEATURE_FLAG_QS_PREFIX='ZZ',
    MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME=FEATURE_FLAG_COOKIE_NAME,
    MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS=FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS,
)
class QueryStringFeatureFlagMiddlewareTest(TestCase):
    """Test QueryStringFeatureFlagMiddleware"""
    def setUp(self):
        self.middleware = QueryStringFeatureFlagMiddleware(get_response=Mock())

    def test_get_flag_key(self):
        assert self.middleware.get_flag_key('EXAMS') == 'ZZ_FEATURE_EXAMS'

    def test_encode_feature_flags(self):
        assert self.middleware.encode_feature_flags(None) == '0'
        assert self.middleware.encode_feature_flags({
            'ZZ_FEATURE_NOTHING': 1,
        }) == '0'

        assert self.middleware.encode_feature_flags({
            'ZZ_FEATURE_EXAMS': 1,
        }) == '1'

    @ddt.data(None, {})
    def test_process_request_no_qs(self, get_value):
        request = Mock()
        request.GET = get_value
        assert self.middleware.process_request(request) is None

    @patch('django.shortcuts.redirect')
    def test_process_request_clear(self, redirect_mock):
        request = Mock()
        request.GET = {
            'ZZ_FEATURE_CLEAR': 1,
        }
        request.path = '/dashboard/'
        assert self.middleware.process_request(request) == redirect_mock.return_value

        redirect_mock.assert_called_once_with('/dashboard/')

        response = redirect_mock.return_value
        response.delete_cookie.assert_called_once_with(FEATURE_FLAG_COOKIE_NAME)

    @patch('django.shortcuts.redirect')
    def test_process_request_query(self, redirect_mock):
        request = Mock()
        request.GET = {
            'ZZ_FEATURE_EXAMS': 1,
        }
        request.path = '/dashboard/'
        assert self.middleware.process_request(request) == redirect_mock.return_value

        redirect_mock.assert_called_once_with('/dashboard/')

        response = redirect_mock.return_value
        response.set_signed_cookie.assert_called_once_with(
            FEATURE_FLAG_COOKIE_NAME,
            '1',
            max_age=FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS,
            httponly=True,
        )


@override_settings(
    MIDDLEWARE_FEATURE_FLAG_QS_PREFIX='ZZ',
    MIDDLEWARE_FEATURE_FLAG_COOKIE_NAME=FEATURE_FLAG_COOKIE_NAME,
    MIDDLEWARE_FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS=FEATURE_FLAG_COOKIE_MAX_AGE_SECONDS,
)
class CookieFeatureFlagMiddlewareTest(TestCase):
    """Test QueryStringFeatureFlagMiddleware"""
    def setUp(self):
        self.middleware = CookieFeatureFlagMiddleware(get_response=Mock())

    def test_decode_feature_flags(self):
        assert self.middleware.decode_feature_flags(0) == set()
        assert self.middleware.decode_feature_flags(1) == {FeatureFlag.EXAMS}

    def test_process_request_valid_cookie(self):
        request = Mock()
        request.COOKIES = {
            FEATURE_FLAG_COOKIE_NAME: 1,
        }
        request.get_signed_cookie.return_value = 1
        assert self.middleware.process_request(request) is None
        assert request.mm_feature_flags == {FeatureFlag.EXAMS}
        request.get_signed_cookie.assert_called_once_with(FEATURE_FLAG_COOKIE_NAME)

    def test_process_request_invalid_cookie(self):
        request = Mock()
        request.COOKIES = {
            FEATURE_FLAG_COOKIE_NAME: 1,
        }
        request.get_signed_cookie.side_effect = ValueError
        assert self.middleware.process_request(request) is None
        assert request.mm_feature_flags == set()
        request.get_signed_cookie.assert_called_once_with(FEATURE_FLAG_COOKIE_NAME)

    def test_process_request_no_cookie(self):
        request = Mock()
        request.COOKIES = {}
        assert self.middleware.process_request(request) is None
        request.get_signed_cookie.assert_not_called()
        assert request.mm_feature_flags == set()
