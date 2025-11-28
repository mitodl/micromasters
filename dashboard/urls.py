"""URLs for dashboard"""
from django.urls import path, re_path

from dashboard.views import (ToggelProgramEnrollmentShareHash,
                             UnEnrollPrograms, UserCourseEnrollment,
                             UserDashboard, UserExamEnrollment)
from profiles.constants import USERNAME_RE_PARTIAL

urlpatterns = [
    re_path(fr'^api/v0/dashboard/(?P<username>{USERNAME_RE_PARTIAL})/$', UserDashboard.as_view(), name='dashboard_api'),
    path('api/v0/course_enrollments/', UserCourseEnrollment.as_view(), name='user_course_enrollments'),
    path('api/v0/unenroll_programs/', UnEnrollPrograms.as_view(), name='unenroll_programs'),
    path('api/v0/enrollment_share_hash/', ToggelProgramEnrollmentShareHash.as_view(), name='toggle_share_hash'),
    path('api/v0/exam_enrollment/', UserExamEnrollment.as_view(), name='exam_course_enrollment'),
]
