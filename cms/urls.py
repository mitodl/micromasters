"""URLs for courses and programs"""

from django.conf.urls import url
from cms.api import api_router

urlpatterns = [
    url('api/v0/wagtail/', api_router.urls),
]
