"""Test for authentication behavior"""
# pylint: disable=redefined-outer-name,unused-argument
import json
from urllib.parse import urlencode, urlparse

import pytest
from django.http.response import HttpResponse

from backends.constants import BACKEND_EDX_ORG, BACKEND_MITX_ONLINE
from courses.factories import CourseRunFactory, ProgramFactory

pytestmark = [pytest.mark.django_db]


def test_signin_redirect(browser, logged_in_staff, mocker, settings):
    """Test the redirect behavior. If the dashboard API returns a 401 it should handle it properly."""
    dashboard_patch = mocker.patch('dashboard.views.UserDashboard.get', return_value=HttpResponse(
        status=401,
        content=json.dumps({"error": "message"}).encode()
    ))
    browser.get("/dashboard", ignore_errors=True)
    base_url = '{uri.scheme}://{uri.netloc}/'.format(uri=urlparse(browser.driver.current_url))
    assert dashboard_patch.called
    assert browser.driver.current_url == f"{base_url}signin/?next=/dashboard/"
    assert browser.driver.find_element_by_css_selector("a.signup-modal-button").text == "CONTINUE WITH EDX"


@pytest.mark.parametrize("next_url", [None, "/dashboard/"])
def test_signin_page_no_program(browser, logged_in_staff, mocker, settings, next_url):
    """Test the redirect behavior. If the dashboard API returns a 401 it should handle it properly."""
    qs = f"?{urlencode({'next': next_url})}" if next_url else ''

    browser.get(f"/signin/{qs}", ignore_errors=True)
    base_url = '{uri.scheme}://{uri.netloc}/'.format(uri=urlparse(browser.driver.current_url))
    print(browser.driver.page_source)
    continue_button = browser.driver.find_element_by_css_selector("a.signup-modal-button")

    assert continue_button.text == "CONTINUE WITH EDX"
    assert continue_button.get_attribute("href") == f"{base_url}login/edxorg/{qs}"


@pytest.mark.parametrize("next_url", [None, "/dashboard/"])
@pytest.mark.parametrize("has_mitxonline_run, backend, button_text", [
    (True, BACKEND_MITX_ONLINE, "CONTINUE WITH MITX ONLINE"),
    (False, BACKEND_EDX_ORG, "CONTINUE WITH EDX"),
])
def test_signin_page_program(
    browser, logged_in_staff, mocker, settings, next_url, has_mitxonline_run, backend, button_text
):  # pylint: disable=too-many-arguments
    """Test the redirect behavior. If the dashboard API returns a 401 it should handle it properly."""
    settings.FEATURES["MITXONLINE_LOGIN"] = True
    program = ProgramFactory.create()
    CourseRunFactory.create(course__program=program, courseware_backend=backend)
    next_params = {'next': next_url} if next_url else {}
    next_qs = f"?{urlencode(next_params)}" if next_params else ""
    qs = f"?{urlencode({'program':program.id, **next_params})}"

    browser.get(f"/signin/{qs}", ignore_errors=True)
    base_url = '{uri.scheme}://{uri.netloc}/'.format(uri=urlparse(browser.driver.current_url))
    continue_button = browser.driver.find_element_by_css_selector("a.signup-modal-button")

    assert continue_button.text == button_text
    assert continue_button.get_attribute("href") == f"{base_url}login/{backend}/{next_qs}"
