"""Tests for search models"""
from unittest.mock import patch

from search.base import MockedESTestCase
from search.factories import PercolateQueryFactory


class SearchModelsTests(MockedESTestCase):
    """Tests for search models"""

    def setUp(self):
        super().setUp()

        # We can't patch the same method twice, so get the patches we already defined
        for _mock in self.patcher_mocks:
            if _mock.name == "_index_percolate_queries":
                self.mocked_index_percolate_queries = _mock
            elif _mock.name == "_delete_percolate_query":
                self.mocked_delete_percolate_query = _mock

    def test_index_create_percolate_query(self):
        """When a new PercolateQuery is created we should index it"""
        with patch('search.signals.transaction', on_commit=lambda callback: callback()):
            percolate_query = PercolateQueryFactory.create()
            assert self.mocked_index_percolate_queries.call_count == 1
            assert len(self.mocked_index_percolate_queries.call_args[0]) == 1
            assert list(self.mocked_index_percolate_queries.call_args[0][0])[0].id == percolate_query.id

    def test_index_update_percolate_query(self):
        """When a PercolateQuery is updated we should index it"""
        with patch('search.signals.transaction', on_commit=lambda callback: callback()):
            percolate_query = PercolateQueryFactory.create()
            self.mocked_index_percolate_queries.reset_mock()
            with patch('search.tasks._index_percolate_queries') as mocked_index_percolate_queries:
                percolate_query.save()
            assert mocked_index_percolate_queries.call_count == 1
            assert len(mocked_index_percolate_queries.call_args[0]) == 1
            assert list(mocked_index_percolate_queries.call_args[0][0])[0].id == percolate_query.id

    def test_index_delete_percolate_query(self):
        """When a PercolateQuery is deleted we should delete it from the index too"""
        with patch('search.signals.transaction', on_commit=lambda callback: callback()):
            percolate_query = PercolateQueryFactory.create()
            percolate_query_id = percolate_query.id
            percolate_query.delete()
            assert self.mocked_delete_percolate_query.call_count == 1
            assert len(self.mocked_delete_percolate_query.call_args[0]) == 1
            assert self.mocked_delete_percolate_query.call_args[0][0] == percolate_query_id
