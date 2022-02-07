"""
Base test classes for search
"""
from unittest.mock import patch

from django.test import (
    TestCase,
    override_settings
)

from dashboard.models import ProgramEnrollment
from search import tasks
from search.indexing_api import delete_indices, create_backing_indices
from search.models import PercolateQuery


@override_settings(DEBUG=True)
class ESTestCase(TestCase):
    """
    Test class for test cases that need a live ES index
    """

    @classmethod
    def setUpClass(cls):
        # Make sure index exists when signals are run.
        reindex_test_es_data()
        super().setUpClass()

    def setUp(self):
        # Make sure index exists when signals are run.
        # We want to run recreate_index instead of clear_index
        # because the test data is contained in a transaction
        # which is reverted after each test runs, so signals don't get run
        # that keep ES up to date.
        reindex_test_es_data()
        super().setUp()

    @classmethod
    def tearDownClass(cls):
        delete_indices()
        super().tearDownClass()


@override_settings(DEBUG=True)
class MockedESTestCase(TestCase):
    """
    Test class that mocks the MicroMasters indexing API to avoid unnecessary ES index operations
    """
    @classmethod
    def setUpClass(cls):
        cls.patchers = []
        cls.patcher_mocks = []
        for name, val in tasks.__dict__.items():
            # This looks for functions starting with _ because those are the functions which are imported
            # from indexing_api. The _ lets it prevent name collisions.
            if callable(val) and name.startswith("_"):
                cls.patchers.append(patch('search.tasks.{0}'.format(name), autospec=True))
        for patcher in cls.patchers:
            mock = patcher.start()
            mock.name = patcher.attribute
            cls.patcher_mocks.append(mock)
        try:
            super().setUpClass()
        except:
            for patcher in cls.patchers:
                patcher.stop()
            raise

    def setUp(self):
        super().setUp()

        for mock in self.patcher_mocks:
            mock.reset_mock()

    @classmethod
    def tearDownClass(cls):
        for patcher in cls.patchers:
            patcher.stop()

        super().tearDownClass()


def reindex_test_es_data():
    """
    Recreates the OpenSearch indices for the live data used in tests
    """
    backing_indices = create_backing_indices()
    tasks.bulk_index_program_enrollments(ProgramEnrollment.objects.order_by("id").values_list("id", flat=True),
                                         backing_indices[0][0], backing_indices[1][0])
    tasks.bulk_index_percolate_queries(PercolateQuery.objects.order_by("id").values_list("id", flat=True),
                                       backing_indices[2][0])
    tasks.finish_recreate_index(results=[], backing_indices=backing_indices)
