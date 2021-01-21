"""Test for redirect on 401 behavior"""
# pylint: disable=redefined-outer-name,unused-argument
import json

from django.conf.urls import url
from django.http.response import HttpResponse
import pytest

from micromasters.urls import urlpatterns


pytestmark = [
    pytest.mark.django_db,
]


FAKE_RESPONSE = 'Custom response message for selenium test'
urlpatterns = [
    url(r'login/edxorg/', lambda *args: HttpResponse(content=FAKE_RESPONSE))
    if hasattr(urlpattern, 'app_name') and urlpattern.app_name == 'social' else urlpattern
    for urlpattern in urlpatterns
]


def test_redirect(browser, logged_in_staff, mocker, settings):
    """Test the redirect behavior. If the dashboard API returns a 401 it should handle it properly."""
    # Set ROOT_URLCONF to this modules path. This will cause the app to use the 'urlpatterns' value defined above
    # at the module level.
    settings.ROOT_URLCONF = __name__
    dashboard_patch = mocker.patch('dashboard.views.UserDashboard.get', return_value=HttpResponse(
        status=401,
        content=json.dumps({"error": "message"}).encode()
    ))
    browser.get("/dashboard", ignore_errors=True)
    assert FAKE_RESPONSE in browser.driver.find_element_by_css_selector("body").text
    assert dashboard_patch.called
