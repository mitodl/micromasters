"""
Base test classes for search
"""
from unittest.mock import patch

from django.test import (
    TestCase,
)

from search import tasks
from search.indexing_api import recreate_index, delete_index


class ESTestCase(TestCase):
    """
    Test class for test cases that need a live ES index
    """

    @classmethod
    def setUpClass(cls):
        # Make sure index exists when signals are run.
        recreate_index()
        super().setUpClass()

    def setUp(self):
        # Make sure index exists when signals are run.
        # We want to run recreate_index instead of clear_index
        # because the test data is contained in a transaction
        # which is reverted after each test runs, so signals don't get run
        # that keep ES up to date.
        recreate_index()
        super().setUp()

    @classmethod
    def tearDownClass(cls):
        delete_index()
        super().tearDownClass()


class MockedESTestCase(TestCase):
    """
    Test class that mocks the MicroMasters indexing API to avoid unnecessary ES index operations
    """
    @classmethod
    def setUpClass(cls):
        cls.patchers = []
        for name, val in tasks.__dict__.items():
            if callable(val) and name.startswith("_"):
                cls.patchers.append(patch('search.tasks.{0}'.format(name), autospec=True))
        for patcher in cls.patchers:
            patcher.start()
        try:
            super().setUpClass()
        except:
            for patcher in cls.patchers:
                patcher.stop()
            raise

    @classmethod
    def tearDownClass(cls):
        for patcher in cls.patchers:
            patcher.stop()

        super().tearDownClass()
