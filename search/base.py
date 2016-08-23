"""
Base test classes for search
"""
from mock import patch

from django.test import (
    override_settings,
    TestCase,
)

from search.api import recreate_index


class ESTestCase(TestCase):
    """
    Set up ES index on setup
    """

    def setUp(self):
        super(ESTestCase, self).setUp()
        recreate_index()


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
