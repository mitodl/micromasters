"""URLs module"""
from django.conf import settings
from django.urls import path, re_path
from django.views.generic import RedirectView
from social_django import views
from social_django.urls import app_name, extra  # pylint: disable=unused-import

# These four endpoints were originally copied from social_django.urls.
urlpatterns = [
    # These four go to views in social_core
    # authentication / association
    path('complete/<str:backend>/', views.complete,
        name='complete'),
    re_path(fr'^login/(?P<backend>[^/]+){extra}$',
        RedirectView.as_view(pattern_name='oauth_maintenance') if settings.OAUTH_MAINTENANCE_MODE else views.auth,
        name='begin'),
    # disconnection
    re_path(fr'^disconnect/(?P<backend>[^/]+){extra}$', views.disconnect,
        name='disconnect'),
    re_path(fr'^disconnect/(?P<backend>[^/]+)/(?P<association_id>[^/]+){extra}$',
        views.disconnect, name='disconnect_individual'),
]
