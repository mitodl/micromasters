"""Profiles for URLs"""
from django.conf.urls import include, url
from rest_framework import routers

from profiles.views import ProfileViewSet

router = routers.DefaultRouter()
router.register(r'profiles', ProfileViewSet)

urlpatterns = [
    url(r'^api/v0/', include(router.urls)),
]
