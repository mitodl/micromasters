"""URLs for search app"""
from django.conf.urls import url

from search.views import ElasticProxyView


urlpatterns = [
    url(r'^api/v0/search/(?P<elastic_url>.*)', ElasticProxyView.as_view(), name='search_api'),
]
