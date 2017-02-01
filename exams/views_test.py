"""
Tests for exam views
"""
from micromasters.test import SimpleTestCase


class PearsonSSOCallbackTests(SimpleTestCase):
    """
    Tests for Pearson callback URLs
    """
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
