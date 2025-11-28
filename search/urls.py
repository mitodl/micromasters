"""URLs for search app"""
from django.urls import re_path

from search.views import OpenSearchProxyView

urlpatterns = [
    re_path(r'^api/v0/search/(?P<opensearch_url>.*)', OpenSearchProxyView.as_view(), name='search_api'),
]
