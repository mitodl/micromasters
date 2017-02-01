"""URLs for exams app"""
from django.conf.urls import url

from exams.views import PearsonCallbackRedirectView

urlpatterns = [
    url(
        r'^pearson/(?P<status>success|error|timeout|logout)/?$',
        PearsonCallbackRedirectView.as_view(),
        name='pearson_callback'
    ),
]
