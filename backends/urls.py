"""URLs module"""
from django.conf import settings
from django.conf.urls import url

from social_core.utils import setting_name
from social_django import views

from backends.views import complete


extra = getattr(settings, setting_name('TRAILING_SLASH'), True) and '/' or ''

app_name = 'social'

urlpatterns = [
    # authentication / association
    url(r'^login/(?P<backend>[^/]+){0}$'.format(extra), views.auth,
        name='begin'),
    # Override default complete view to force logout before login
    url(r'^complete/(?P<backend>[^/]+)/$', complete,
        name='complete'),
    # disconnection
    url(r'^disconnect/(?P<backend>[^/]+){0}$'.format(extra), views.disconnect,
        name='disconnect'),
    url(r'^disconnect/(?P<backend>[^/]+)/(?P<association_id>[^/]+){0}$'
        .format(extra), views.disconnect, name='disconnect_individual'),
]
