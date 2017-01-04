"""URLs for courses and programs"""

from django.conf.urls import include, url
from rest_framework import routers

from courses.views import (
    ProgramEnrollmentListView,
    ProgramViewSet,
)

router = routers.DefaultRouter()
router.register(r'programs', ProgramViewSet)

urlpatterns = [
    url(r'^api/v0/', include(router.urls)),
    url(r'^api/v0/enrolledprograms/$', ProgramEnrollmentListView.as_view(), name='user_program_enrollments'),
]
