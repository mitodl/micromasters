"""URLs for search app"""
from django.conf.urls import url

from search.views import OpenSearchProxyView


urlpatterns = [
    url(r'^api/v0/search/(?P<opensearch_url>.*)', OpenSearchProxyView.as_view(), name='search_api'),
]
