"""
cms views
"""
from django.contrib.auth.views import redirect_to_login
from django.urls import reverse


def cms_signin_redirect_to_site_signin(request):
    """Redirect wagtail admin signin to site signin page"""
    return redirect_to_login(reverse("wagtailadmin_home"), login_url="/")


def cms_password_reset_redirect_to_site_signin(request):
    """Redirect wagtail admin password reset to site signin page"""
    return redirect_to_login(reverse("wagtailadmin_home"), login_url="/")
