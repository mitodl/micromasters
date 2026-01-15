"""
URLs for ui
"""
from django.urls import path, re_path

from certificates.views import (CourseCertificateView, GradeRecordView,
                                ProgramCertificateView, ProgramLetterView,
                                SharedGradeRecordView)
from profiles.constants import USERNAME_RE_PARTIAL
from ui.url_utils import DASHBOARD_URLS
from ui.views import (BackgroundImagesCSSView, DashboardView, SignInView,
                      UsersView, logout_view, need_verified_email,
                      oauth_maintenance, page_404, page_500)

dashboard_urlpatterns = [
    re_path(rf"^{dashboard_url.lstrip('/')}$", DashboardView.as_view(), name='ui-dashboard')
    for dashboard_url in DASHBOARD_URLS
]

urlpatterns = [
    path('logout/', logout_view, name='logout'),
    path('signin/', SignInView.as_view(), name='signin'),
    path('404/', page_404, name='ui-404'),
    path('500/', page_500, name='ui-500'),
    path('verify-email/', need_verified_email, name='verify-email'),
    path('oauth_maintenance/<str:backend>/', oauth_maintenance, name='oauth_maintenance'),
    re_path(fr'^learner/(?P<user>{USERNAME_RE_PARTIAL})?/?', UsersView.as_view(), name='ui-users'),
    re_path(r'^certificate/course/(?P<certificate_hash>[-\w.]+)?/?', CourseCertificateView.as_view(), name='certificate'),
    re_path(r'^certificate/program/(?P<certificate_hash>[-\w.]+)?/?', ProgramCertificateView.as_view(),
        name='program-certificate'),
    re_path(r'^letter/program/(?P<letter_uuid>[-\w.]+)?/?', ProgramLetterView.as_view(),
        name='program_letter'),
    re_path(r'^records/programs/(?P<enrollment_id>[\d]+)/shared/(?P<record_share_hash>[-\w.]+)?/?', SharedGradeRecordView.as_view(),
        name='shared_grade_records'),
    re_path(r'^records/programs/(?P<enrollment_id>[\d]+)', GradeRecordView.as_view(),
        name='grade_records'),
    path('background-images.css', BackgroundImagesCSSView.as_view(), name='background-images-css'),
] + dashboard_urlpatterns
