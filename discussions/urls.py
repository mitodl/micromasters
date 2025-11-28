"""
URLs for discussions
"""
from django.urls import path

from discussions.views import (ChannelsView, discussions_redirect,
                               discussions_token)

urlpatterns = [
    path('api/v0/discussions_token/', discussions_token, name='discussions_token'),
    path('discussions/', discussions_redirect, name='discussions'),
    path('api/v0/channels/', ChannelsView.as_view(), name='channel-list'),
]
