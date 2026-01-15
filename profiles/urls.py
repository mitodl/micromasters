"""Profiles for URLs"""
from django.urls import include, path
from rest_framework import routers

from profiles.views import ProfileViewSet

router = routers.DefaultRouter()
router.register(r'profiles', ProfileViewSet)

urlpatterns = [
    path('api/v0/', include(router.urls)),
]
