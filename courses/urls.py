"""URLs for courses and programs"""

from django.conf.urls import include, url
from rest_framework import routers

from courses.views import (
    ProgramEnrollmentListView,
    ProgramViewSet,
    ProgramLearnersView
)

router = routers.DefaultRouter()
router.register(r'programs', ProgramViewSet)

urlpatterns = [
    url(r'^api/v0/', include(router.urls)),
    url(r'^api/v0/enrolledprograms/$', ProgramEnrollmentListView.as_view(), name='user_program_enrollments'),
    url(r'^api/v0/programlearners/(?P<program_id>[\d]+)/$',
        ProgramLearnersView.as_view(), name='learners_in_program'),
]
