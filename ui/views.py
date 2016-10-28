"""
ui views
"""
import json
import logging

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.core.urlresolvers import reverse
from django.shortcuts import Http404, redirect, render
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import View
from raven.contrib.django.raven_compat.models import client as sentry
from rolepermissions.shortcuts import available_perm_status
from rolepermissions.verifications import has_role

from micromasters.utils import webpack_dev_server_host, webpack_dev_server_url
from micromasters.serializers import UserSerializer
from profiles.api import get_social_username
from profiles.permissions import CanSeeIfNotPrivate
from roles.models import Instructor, Staff
from ui.decorators import require_mandatory_urls

log = logging.getLogger(__name__)


def get_bundle_url(request, bundle_name):
    """
    Create a URL for the webpack bundle.
    """
    if settings.DEBUG and settings.USE_WEBPACK_DEV_SERVER:
        return "{host_url}/{bundle}".format(
            host_url=webpack_dev_server_url(request),
            bundle=bundle_name
        )
    else:
        return static("bundles/{bundle}".format(bundle=bundle_name))


class ReactView(View):  # pylint: disable=unused-argument
    """
    Abstract view for templates using React
    """
    def get(self, request, *args, **kwargs):
        """
        Handle GET requests to templates using React
        """
        user = request.user
        username = get_social_username(user)
        roles = []
        if not user.is_anonymous():
            roles = [
                {
                    'program': role.program.id,
                    'role': role.role,
                    'permissions': [perm for perm, value in available_perm_status(user).items() if value is True]
                } for role in user.role_set.all()
            ]

        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "reactGaDebug": settings.REACT_GA_DEBUG,
            "authenticated": not user.is_anonymous(),
            "username": username,
            "host": webpack_dev_server_host(request),
            "edx_base_url": settings.EDXORG_BASE_URL,
            "roles": roles,
            "release_version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "sentry_dsn": sentry.get_public_dsn(),
            "search_url": reverse('search_api', kwargs={"elastic_url": ""}),
            "support_email": settings.EMAIL_SUPPORT,
            "user": UserSerializer().to_representation(request.user),
        }

        return render(
            request,
            "dashboard.html",
            context={
                "sentry_client": get_bundle_url(request, "sentry_client.js"),
                "zendesk_widget": get_bundle_url(request, "zendesk_widget.js"),
                "style_src": get_bundle_url(request, "style.js"),
                "dashboard_src": get_bundle_url(request, "dashboard.js"),
                "js_settings_json": json.dumps(js_settings),
                "tracking_id": "",
            }
        )

    def post(self, request, *args, **kwargs):
        """Redirect to GET. This assumes there's never any good reason to POST to these views."""
        return redirect(request.build_absolute_uri())


@method_decorator(require_mandatory_urls, name='dispatch')
@method_decorator(login_required, name='dispatch')
@method_decorator(csrf_exempt, name='dispatch')
class DashboardView(ReactView):
    """
    Wrapper for dashboard view which asserts certain logged in requirements
    """


class UsersView(ReactView):
    """
    View for learner pages. This gets handled by the dashboard view like all other
    React handled views, but we also want to return a 404 if the user does not exist.
    """
    def get(self, request, *args, **kwargs):
        """
        Handle GET requests
        """
        user = kwargs.pop('user')
        if user is not None:
            if not CanSeeIfNotPrivate().has_permission(request, self):
                raise Http404
        elif request.user.is_anonymous():
            # /learner/ redirects to logged in user's page, but user is not logged in here
            raise Http404

        return super(UsersView, self).get(request, *args, **kwargs)


def standard_error_page(request, status_code, template_filename):
    """
    Returns an error page with a given template filename and provides necessary context variables
    """
    name = request.user.profile.preferred_name if not request.user.is_anonymous() else ""
    authenticated = not request.user.is_anonymous()
    username = get_social_username(request.user)
    response = render(
        request,
        template_filename,
        context={
            "zendesk_widget": get_bundle_url(request, "zendesk_widget.js"),
            "style_src": get_bundle_url(request, "style.js"),
            "signup_dialog_src": get_bundle_url(request, "signup_dialog.js"),
            "dashboard_src": get_bundle_url(request, "dashboard.js"),
            "sentry_client": get_bundle_url(request, "sentry_client.js"),
            "js_settings_json": json.dumps({
                "release_version": settings.VERSION,
                "environment": settings.ENVIRONMENT,
                "sentry_dsn": sentry.get_public_dsn(),
                "user": UserSerializer().to_representation(request.user),
            }),
            "authenticated": authenticated,
            "name": name,
            "username": username,
            "is_staff": has_role(request.user, [Staff.ROLE_ID, Instructor.ROLE_ID]),
            "support_email": settings.EMAIL_SUPPORT,
            "sentry_dsn": sentry.get_public_dsn(),
        }
    )
    response.status_code = status_code
    return response


def terms_of_service(request):
    """
    Handles the terms of service page
    """
    return render(
        request,
        "terms_of_service.html",
        context={
            "zendesk_widget": get_bundle_url(request, "zendesk_widget.js"),
            "style_src": get_bundle_url(request, "style.js"),
            "sentry_client": get_bundle_url(request, "sentry_client.js"),
            "js_settings_json": json.dumps({
                "release_version": settings.VERSION,
                "environment": settings.ENVIRONMENT,
                "sentry_dsn": sentry.get_public_dsn(),
                "user": UserSerializer().to_representation(request.user),
            }),
            "signup_dialog_src": get_bundle_url(request, "signup_dialog.js"),
            "tracking_id": "",
        }
    )


def page_404(request, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Overridden handler for the 404 error pages.
    """
    return standard_error_page(request, 404, "404.html")


def page_500(request, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Overridden handler for the 404 error pages.
    """
    return standard_error_page(request, 500, "500.html")
