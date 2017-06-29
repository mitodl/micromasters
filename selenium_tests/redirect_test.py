"""Test for redirect on 401 behavior"""
from unittest.mock import patch

from django.conf.urls import url
from django.http.response import HttpResponse

from micromasters.urls import urlpatterns
from selenium_tests.base import SeleniumTestsBase


FAKE_RESPONSE = 'Custom response message for selenium test'
urlpatterns = [
    url(r'login/edxorg/', lambda *args: HttpResponse(content=FAKE_RESPONSE))
    if urlpattern.app_name == 'social' else urlpattern
    for urlpattern in urlpatterns
]


class RedirectTest(SeleniumTestsBase):
    """
    If the dashboard API returns a 401 it should handle it properly
    """

    def test_redirect(self):
        """Test the redirect behavior"""
        self.login_via_admin(self.user)
        with self.settings(
            ROOT_URLCONF=__name__,
        ), patch(
            'dashboard.views.UserDashboard.get', return_value=HttpResponse(status=401)
        ) as mocked_get:
            self.get("/dashboard", ignore_errors=True)
        assert FAKE_RESPONSE in self.selenium.find_element_by_css_selector("body").text
        assert mocked_get.called
