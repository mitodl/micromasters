"""URLs module"""
from django.conf.urls import url
from django.conf import settings

from social_django import views
from social_django.urls import (  # pylint: disable=unused-import
    app_name,
    extra,
)

from backends.views import complete
from ui.views import aouth_maintenance


# These four endpoints were originally copied from social_django.urls. 'complete' is a modified view which
# we are substituting to log out the user to workaround social auth creation issues.
urlpatterns = [
    # Override default complete view to force logout before login
    url(r'^complete/(?P<backend>[^/]+)/$', complete,
        name='complete'),

    # These three go to views in social_core
    # authentication / association

    url(r'^login/(?P<backend>[^/]+){0}$'.format(extra),
        aouth_maintenance if settings.OAUTH_MAINTENANCE_MODE else views.auth,
        name='begin'),
    # disconnection
    url(r'^disconnect/(?P<backend>[^/]+){0}$'.format(extra), views.disconnect,
        name='disconnect'),
    url(r'^disconnect/(?P<backend>[^/]+)/(?P<association_id>[^/]+){0}$'
        .format(extra), views.disconnect, name='disconnect_individual'),
]
