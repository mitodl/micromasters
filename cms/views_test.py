"""
Test end to end django views.
"""
import pytest
from django.urls import reverse

pytestmark = [pytest.mark.django_db]


# @pytest.fixture(autouse=True)
# def _disable_debug(settings):
#     """Ensure DEBUG is off so debug-toolbar URLs aren't required."""
#     settings.DEBUG = False
#     settings.INSTALLED_APPS = [
#         app for app in settings.INSTALLED_APPS if app != "debug_toolbar"
#     ]
#     settings.MIDDLEWARE = [
#         mw for mw in settings.MIDDLEWARE if "debug_toolbar" not in mw
#     ]


def test_cms_signin_redirect_to_site_signin(client):
    """
    Test that the cms/password_reset redirects users to site signin page.
    """
    response = client.get(reverse("wagtailadmin_home"), follow=True)
    assert response.template_name == "cms/home_page.html"


def test_cms_password_reset_redirect_to_site_signin(client):
    """
    Test that the cms/password_reset redirects users to site signin page.
    """
    response = client.get(reverse("wagtailadmin_password_reset"), follow=True)
    assert response.template_name == "cms/home_page.html"
