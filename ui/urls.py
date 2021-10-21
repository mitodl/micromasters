"""
URLs for ui
"""
from django.conf.urls import url
from django.contrib.auth import views as auth_views

from certificates.views import (
    CourseCertificateView,
    GradeRecordView,
    ProgramCertificateView,
    ProgramLetterView,
    SharedGradeRecordView,
)
from profiles.constants import USERNAME_RE_PARTIAL
from ui.url_utils import (
    DASHBOARD_URLS,
)
from ui.views import (
    DashboardView,
    UsersView,
    SignInView,
    page_404,
    page_500,
    BackgroundImagesCSSView,
    need_verified_email,
    oauth_maintenance)

dashboard_urlpatterns = [
    url(r'^{}$'.format(dashboard_url.lstrip("/")), DashboardView.as_view(), name='ui-dashboard')
    for dashboard_url in DASHBOARD_URLS
]

urlpatterns = [
    url(r'^logout/$', auth_views.LogoutView.as_view(), name='logout'),
    url(r'^signin/$', SignInView.as_view(), name='signin'),
    url(r'^404/$', page_404, name='ui-404'),
    url(r'^500/$', page_500, name='ui-500'),
    url(r'^verify-email/$', need_verified_email, name='verify-email'),
    url(r'^oauth_maintenance/(?P<backend>[^/]+)/$', oauth_maintenance, name='oauth_maintenance'),
    url(fr'^learner/(?P<user>{USERNAME_RE_PARTIAL})?/?', UsersView.as_view(), name='ui-users'),
    url(r'^certificate/course/(?P<certificate_hash>[-\w.]+)?/?', CourseCertificateView.as_view(), name='certificate'),
    url(r'^certificate/program/(?P<certificate_hash>[-\w.]+)?/?', ProgramCertificateView.as_view(),
        name='program-certificate'),
    url(r'^letter/program/(?P<letter_uuid>[-\w.]+)?/?', ProgramLetterView.as_view(),
        name='program_letter'),
    url(r'^records/programs/(?P<enrollment_id>[\d]+)/shared/(?P<record_share_hash>[-\w.]+)?/?', SharedGradeRecordView.as_view(),
        name='shared_grade_records'),
    url(r'^records/programs/(?P<enrollment_id>[\d]+)', GradeRecordView.as_view(),
        name='grade_records'),
    url(r'^background-images\.css$', BackgroundImagesCSSView.as_view(), name='background-images-css'),
] + dashboard_urlpatterns
