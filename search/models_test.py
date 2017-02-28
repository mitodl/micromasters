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
        assert mocked_index_percolate_queries.call_count == 1
        assert len(mocked_index_percolate_queries.call_args[0]) == 1
        assert list(mocked_index_percolate_queries.call_args[0][0])[0].id == percolate_query.id

    def test_index_update_percolate_query(self):
        """When a PercolateQuery is updated we should index it"""
        with patch('search.tasks._index_percolate_queries'):
            percolate_query = PercolateQuery.objects.create(query={})
        with patch('search.tasks._index_percolate_queries') as mocked_index_percolate_queries:
            percolate_query.save()
        assert mocked_index_percolate_queries.call_count == 1
        assert len(mocked_index_percolate_queries.call_args[0]) == 1
        assert list(mocked_index_percolate_queries.call_args[0][0])[0].id == percolate_query.id

    def test_index_delete_percolate_query(self):
        """When a PercolateQuery is deleted we should delete it from the index too"""
        with patch('search.tasks._index_percolate_queries'):
            percolate_query = PercolateQuery.objects.create(query={})
        percolate_query_id = percolate_query.id
        with patch('search.tasks._delete_percolate_query') as mocked_delete_percolate_query:
            percolate_query.delete()
        assert mocked_delete_percolate_query.call_count == 1
        assert len(mocked_delete_percolate_query.call_args[0]) == 1
        assert mocked_delete_percolate_query.call_args[0][0] == percolate_query_id
