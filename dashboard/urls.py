"""URLs for dashboard"""
from django.conf.urls import url

from dashboard.views import (
    UserCourseEnrollment,
    UserDashboard,
    UnEnrollPrograms,
    ToggelProgramEnrollmentShareHash,
)
from profiles.constants import USERNAME_RE_PARTIAL

urlpatterns = [
    url(fr'^api/v0/dashboard/(?P<username>{USERNAME_RE_PARTIAL})/$', UserDashboard.as_view(), name='dashboard_api'),
    url(r'^api/v0/course_enrollments/$', UserCourseEnrollment.as_view(), name='user_course_enrollments'),
    url(r'^api/v0/unenroll_programs/$', UnEnrollPrograms.as_view(), name='unenroll_programs'),
    url(r'^api/v0/enrollment_share_hash/$', ToggelProgramEnrollmentShareHash.as_view(), name='toggle_share_hash'),
]
