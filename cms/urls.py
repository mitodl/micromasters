"""URLs for courses and programs"""

from django.conf.urls import include, url
from rest_framework import routers

from cms.views import (
    ProgramPageViewSet,
)
from cms.api import api_router

urlpatterns = [
    url('api/v0/wagtail/', api_router.urls),
]
