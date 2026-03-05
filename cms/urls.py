"""URLs for courses and programs"""

from django.urls import re_path

from cms.api import api_router

urlpatterns = [
    re_path('api/v0/wagtail/', api_router.urls),
]
