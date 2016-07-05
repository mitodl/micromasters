"""
URLs for ui
"""
from django.conf.urls import url

from ui.url_utils import (
    DASHBOARD_URL,
    PROFILE_URL,
    TERMS_OF_SERVICE_URL,
    SETTINGS_URL,
)
from ui.views import (
    DashboardView,
    UsersView,
    page_404,
    page_500,
)

dashboard_urlpatterns = [
    url(r'^{}$'.format(dashboard_url.lstrip("/")), DashboardView.as_view(), name='ui-dashboard')
    for dashboard_url in [
        DASHBOARD_URL,
        PROFILE_URL,
        TERMS_OF_SERVICE_URL,
        SETTINGS_URL,
    ]
]

urlpatterns = [
    url(r'^logout/$', 'django.contrib.auth.views.logout', {'next_page': '/'}),
    url(r'^404/$', page_404, name='ui-404'),
    url(r'^500/$', page_500, name='ui-500'),
    url(r'^users/(?P<user>[-\w]+)?/?', UsersView.as_view(), name='ui-users'),
] + dashboard_urlpatterns
