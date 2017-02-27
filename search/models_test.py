"""Tests for search models"""
from unittest.mock import patch

from search.base import MockedESTestCase
from search.models import PercolateQuery


class SearchModelsTests(MockedESTestCase):
    """Tests for search models"""

    def test_index_create_percolate_query(self):
        """When a new PercolateQuery is created we should index it"""
        with patch('search.tasks._index_percolate_queries') as mocked_index_percolate_queries:
            percolate_query = PercolateQuery.objects.create(query={})
        mocked_index_percolate_queries.assert_called_once_with([percolate_query])

    def test_index_update_percolate_query(self):
        """When a PercolateQuery is updated we should index it"""
        with patch('search.tasks._index_percolate_queries'):
            percolate_query = PercolateQuery.objects.create(query={})
        with patch('search.tasks._index_percolate_queries') as mocked_index_percolate_queries:
            percolate_query.save()
        mocked_index_percolate_queries.assert_called_once_with([percolate_query])

    def test_index_delete_percolate_query(self):
        """When a PercolateQuery is deleted we should delete it from the index too"""
        with patch('search.tasks._index_percolate_queries'):
            percolate_query = PercolateQuery.objects.create(query={})
        with patch('search.tasks._delete_percolate_query') as mocked_delete_percolate_query:
            percolate_query.delete()
        mocked_delete_percolate_query.assert_called_once_with(percolate_query)
