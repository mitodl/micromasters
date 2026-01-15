"""URLs for courses and programs"""

from django.urls import include, path, re_path
from rest_framework import routers

from courses.views import (CatalogViewSet, CourseRunViewSet,
                           ProgramEnrollmentListView, ProgramLearnersView,
                           ProgramViewSet)

router = routers.DefaultRouter()
router.register(r'programs', ProgramViewSet)
router.register(r'courseruns', CourseRunViewSet)
router.register(r'catalog', CatalogViewSet, basename="catalog")

urlpatterns = [
    path('api/v0/', include(router.urls)),
    path('api/v0/enrolledprograms/', ProgramEnrollmentListView.as_view(), name='user_program_enrollments'),
    re_path(r'^api/v0/programlearners/(?P<program_id>[\d]+)/$',
        ProgramLearnersView.as_view(), name='learners_in_program'),
]
