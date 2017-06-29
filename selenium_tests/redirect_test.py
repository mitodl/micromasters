"""Test for redirect on 401 behavior"""
from unittest.mock import patch

from django.http.response import HttpResponse

from selenium_tests.base import SeleniumTestsBase


class RedirectTest(SeleniumTestsBase):
    """
    If the dashboard API returns a 401 it should handle it properly
    """
    RESPONSE = 'Custom response message for selenium test'

    @classmethod
    def make_patchers(cls):
        return super().make_patchers() + [
            patch('social_django.views.auth', return_value=HttpResponse(content=cls.RESPONSE)),
            patch('dashboard.views.UserDashboard.get', return_value=HttpResponse(status=401)),
        ]

    def test_redirect(self):
        """Test the redirect behavior"""

        self.login_via_admin(self.user)
        self.get("/dashboard", ignore_errors=True)
        assert self.RESPONSE in self.selenium.find_element_by_css_selector("body").text
