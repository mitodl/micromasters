"""
Base test classes for search
"""
from unittest.mock import patch

from django.test import (
    override_settings,
    TestCase,
)

from search.indexing_api import recreate_index


class ESTestCase(TestCase):
    """
    Set up ES index on setup
    """

    @classmethod
    def setUpTestData(cls):
        # Make sure index exists when signals are run.
        recreate_index()
        super().setUpTestData()

    def setUp(self):
        # Make sure index exists when signals are run.
        # We want to run recreate_index instead of clear_index
        # because the test data is contained in a transaction
        # which is reverted after each test runs, so signals don't get run
        # that keep ES up to date.
        recreate_index()
        super().setUp()


@override_settings(ELASTICSEARCH_URL="fake")
class MockedESTestCase(TestCase):
    """
    Mock ES signals
    """

    def setUp(self):
        self.patchers = [
            patch('search.api.get_conn', autospec=True),
            patch('search.api.bulk', autospec=True, return_value=(0, [])),
            patch('search.api.Mapping', autospec=True),
        ]
        for patcher in self.patchers:
            patcher.start()
        try:
            super(MockedESTestCase, self).setUp()
        except:
            for patcher in self.patchers:
                patcher.stop()
            raise

    def tearDown(self):
        try:
            super(MockedESTestCase, self).tearDown()
        finally:
            for patcher in self.patchers:
                patcher.stop()
