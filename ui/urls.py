"""
URLs for ui
"""
from django.conf.urls import url

from ui.url_utils import (
    DASHBOARD_URL,
    PROFILE_URL,
    TERMS_OF_SERVICE_URL,
    SETTINGS_URL,
    SEARCH_URL,
)
from ui.views import (
    DashboardView,
    UsersView,
    terms_of_service,
    page_404,
    page_500,
)

dashboard_urlpatterns = [
    url(r'^{}$'.format(dashboard_url.lstrip("/")), DashboardView.as_view(), name='ui-dashboard')
    for dashboard_url in [
        DASHBOARD_URL,
        PROFILE_URL,
        SETTINGS_URL,
        SEARCH_URL,
    ]
]

urlpatterns = [
    url(r'^logout/$', 'django.contrib.auth.views.logout', {'next_page': '/'}),
    url(r'^404/$', page_404, name='ui-404'),
    url(r'^500/$', page_500, name='ui-500'),
    url(r'^learner/(?P<user>[-\w]+)?/?', UsersView.as_view(), name='ui-users'),
    url(r'^{}$'.format(TERMS_OF_SERVICE_URL.lstrip("/")), terms_of_service, name='terms_of_service'),
] + dashboard_urlpatterns
