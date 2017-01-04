"""URLs for dashboard"""
from django.conf.urls import url

from dashboard.views import (
    UserCourseEnrollment,
    UserDashboard,
)

urlpatterns = [
    url(r'^api/v0/dashboard/$', UserDashboard.as_view(), name='dashboard_api'),
    url(r'^api/v0/course_enrollments/$', UserCourseEnrollment.as_view(), name='user_course_enrollments'),
]
