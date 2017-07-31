"""URLs module"""
from django.conf.urls import url

from social_django import views
from social_django.urls import extra

from backends.views import complete


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
