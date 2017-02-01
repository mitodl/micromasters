"""
Tests for exam views
"""
from unittest.mock import patch
from django.test import SimpleTestCase

# These fake middlewares allow us to use Django.test.SimpleTestCase,
# which runs faster and doesn't touch the database at all.


class FakeSiteMiddleware(object):  # pylint: disable=missing-docstring
    def process_request(self, request):  # pylint: disable=missing-docstring,no-self-use
        request.site = None
        return None


class FakeRedirectMiddleware(object):  # pylint: disable=missing-docstring
    def process_request(self, request):  # pylint: disable=missing-docstring,no-self-use,unused-argument
        return None


class PearsonSSOCallbackTests(SimpleTestCase):
    """
    Tests for Pearson callback URLs
    """
    def setUp(self):
        site_patcher = patch(
            'wagtail.wagtailcore.middleware.SiteMiddleware',
            new=FakeSiteMiddleware
        )
        redirect_patcher = patch(
            'wagtail.wagtailredirects.middleware.RedirectMiddleware',
            new=FakeRedirectMiddleware
        )
        site_patcher.start()
        self.addCleanup(site_patcher.stop)
        redirect_patcher.start()
        self.addCleanup(redirect_patcher.stop)

    def test_success(self):
        """
        Test /pearson/success URL
        """
        response = self.client.get('/pearson/success/')
        assert response.status_code == 302
        assert response.url == "/dashboard?exam=success"

    def test_error(self):
        """
        Test /pearson/error URL
        """
        response = self.client.get('/pearson/error/')
        assert response.status_code == 302
        assert response.url == "/dashboard?exam=error"

    def test_timeout(self):
        """
        Test /pearson/error URL
        """
        response = self.client.get('/pearson/timeout/')
        assert response.status_code == 302
        assert response.url == "/dashboard?exam=timeout"

    def test_logout(self):
        """
        Test /pearson/logout URL
        """
        response = self.client.get('/pearson/logout/')
        assert response.status_code == 302
        assert response.url == "/dashboard?exam=logout"

    def test_not_found(self):
        """
        Test a URL under /pearson that doesn't exist
        """
        response = self.client.get('/pearson/other/')
        assert response.status_code == 404
