"""
ui views
"""
import json
import logging

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.views.generic import View
from django.shortcuts import (
    render,
    Http404,
)
from django.utils.decorators import method_decorator

from backends.edxorg import EdxOrgOAuth2
from micromasters.utils import webpack_dev_server_host, webpack_dev_server_url
from profiles.permissions import CanSeeIfNotPrivate
from ui.decorators import (
    require_mandatory_urls,
)

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
        username = None
        name = ""
        if not request.user.is_anonymous():
            name = request.user.profile.preferred_name
            social_auths = request.user.social_auth.filter(
                provider=EdxOrgOAuth2.name)
            if social_auths.exists():
                username = social_auths.first().uid

        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "reactGaDebug": settings.REACT_GA_DEBUG,
            "authenticated": not request.user.is_anonymous(),
            "name": name,
            "username": username,
            "host": webpack_dev_server_host(request),
            "edx_base_url": settings.EDXORG_BASE_URL
        }

        return render(
            request,
            "dashboard.html",
            context={
                "style_src": get_bundle_url(request, "style.js"),
                "dashboard_src": get_bundle_url(request, "dashboard.js"),
                "js_settings_json": json.dumps(js_settings),
            }
        )


@method_decorator(require_mandatory_urls, name='dispatch')
@method_decorator(login_required, name='dispatch')
class DashboardView(ReactView):
    """
    Wrapper for dashboard view which asserts certain logged in requirements
    """


class UsersView(ReactView):
    """
    View for users pages. This gets handled by the dashboard view like all other
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
            # /users/ redirects to logged in user's page, but user is not logged in here
            raise Http404

        return super(UsersView, self).get(request, *args, **kwargs)


def page_404(request):
    """
    Overridden handler for the 404 error pages.
    """
    name = request.user.profile.preferred_name if not request.user.is_anonymous() else ""

    response = render(
        request,
        "404.html",
        context={
            "style_src": get_bundle_url(request, "style.js"),
            "dashboard_src": get_bundle_url(request, "dashboard.js"),
            "js_settings_json": "{}",
            "authenticated": not request.user.is_anonymous(),
            "name": name,
        }
    )
    response.status_code = 404
    return response


def page_500(request):
    """
    Overridden handler for the 500 error pages.
    """
    name = request.user.profile.preferred_name if not request.user.is_anonymous() else ""

    response = render(
        request,
        "500.html",
        context={
            "style_src": get_bundle_url(request, "style.js"),
            "dashboard_src": get_bundle_url(request, "dashboard.js"),
            "js_settings_json": "{}",
            "authenticated": not request.user.is_anonymous(),
            "name": name,
        }
    )
    response.status_code = 500
    return response
