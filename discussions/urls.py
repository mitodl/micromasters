"""
URLs for discussions
"""
from django.conf.urls import url

from discussions.views import (
    ChannelsView,
    discussions_token,
    discussions_redirect,
)

urlpatterns = [
    url(r'^api/v0/discussions_token/$', discussions_token, name='discussions_token'),
    url(r'^discussions/$', discussions_redirect, name='discussions'),
    url(r'^api/v0/channels/$', ChannelsView.as_view(), name='channel-list'),
]
