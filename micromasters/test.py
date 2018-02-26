"""
Test utilities
"""
from unittest.mock import patch
import django.test
from django.utils.deprecation import MiddlewareMixin


class FakeSiteMiddleware(MiddlewareMixin):
    """
    A mock implementation of `wagtail.core.middleware.SiteMiddleware`
    that doesn't make any database calls.
    """
    def process_request(self, request):  # pylint: disable=missing-docstring,no-self-use
        request.site = None
        return None


class FakeRedirectMiddleware(MiddlewareMixin):
    """
    A mock implementation of `wagtail.contrib.redirects.middleware.RedirectMiddleware`
    that doesn't make any database calls.
    """
    def process_request(self, request):  # pylint: disable=missing-docstring,no-self-use,unused-argument
        return None


class SimpleTestCase(django.test.SimpleTestCase):
    """
    Inherits from `django.test.SimpleTestCase`, which doesn't set up the
    database at all. Mocks out the Wagtail middlewares that make
    database calls.
    """
    def setUp(self):
        site_patcher = patch(
            'wagtail.core.middleware.SiteMiddleware',
            new=FakeSiteMiddleware
        )
        redirect_patcher = patch(
            'wagtail.contrib.redirects.middleware.RedirectMiddleware',
            new=FakeRedirectMiddleware
        )
        site_patcher.start()
        self.addCleanup(site_patcher.stop)
        redirect_patcher.start()
        self.addCleanup(redirect_patcher.stop)
        super().setUp()
