"""
URLs for ui
"""
from django.conf.urls import url
from django.contrib.auth import views as auth_views

from ui.url_utils import (
    DASHBOARD_URLS,
    TERMS_OF_SERVICE_URL,
)
from ui.views import (
    DashboardView,
    UsersView,
    terms_of_service,
    page_404,
    page_500,
    BackgroundImagesCSSView,
    need_verified_email,
)
from certificates.views import CourseCertificateView, ProgramCertificateView

dashboard_urlpatterns = [
    url(r'^{}$'.format(dashboard_url.lstrip("/")), DashboardView.as_view(), name='ui-dashboard')
    for dashboard_url in DASHBOARD_URLS
]

urlpatterns = [
    url(r'^logout/$', auth_views.logout, {'next_page': '/'}),
    url(r'^404/$', page_404, name='ui-404'),
    url(r'^500/$', page_500, name='ui-500'),
    url(r'^verify-email/$', need_verified_email, name='verify-email'),
    url(r'^learner/(?P<user>[-\w.]+)?/?', UsersView.as_view(), name='ui-users'),
    url(r'^certificate/course/(?P<certificate_hash>[-\w.]+)?/?', CourseCertificateView.as_view(), name='certificate'),
    url(r'^certificate/program/(?P<certificate_hash>[-\w.]+)?/?', ProgramCertificateView.as_view(),
        name='program-certificate'),
    url(r'^{}$'.format(TERMS_OF_SERVICE_URL.lstrip("/")), terms_of_service, name='terms_of_service'),
    url(r'^background-images\.css$', BackgroundImagesCSSView.as_view(), name='background-images-css'),
] + dashboard_urlpatterns
