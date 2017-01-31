"""
Tests for signals
"""

from unittest.mock import patch

from django.db.models.signals import post_save
from django.test import (
    override_settings,
    TestCase,
)
from factory.django import mute_signals

from courses.factories import ProgramFactory, CourseFactory

from dashboard.models import ProgramEnrollment
from profiles.factories import ProfileFactory


# Make sure that any unmocked ES activity results in an error
@override_settings(ELASTICSEARCH_URL="fake")
class IndexingTests(TestCase):
    """
    Test class for signals that index certain objects in Elasticsearch
    """
    @classmethod
    def setUpTestData(cls):
        super(IndexingTests, cls).setUpTestData()
        with mute_signals(post_save):
            cls.user = ProfileFactory.create().user
            cls.program = ProgramFactory.create()
            cls.course = CourseFactory.create(program=cls.program)


class ProgramEnrollmentTests(IndexingTests):
    """
    Test indexing on program enrollment
    """
    def test_create(self):
        """
        Tests that the database is reindexed when a ProgramEnrollment is created
        """
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        mocked.assert_called_once_with([enrollment])

    def test_update(self):
        """
        Tests that the database is reindexed when a ProgramEnrollment is created
        """
        with mute_signals(post_save):
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment.save()
        mocked.assert_called_once_with([enrollment])

    def test_delete(self):
        """
        Tests that if a CachedEnrollment is updated with data=None, the enrollment in the program is not deleted.
        """
        with mute_signals(post_save):
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        with patch('search.tasks._remove_program_enrolled_user', autospec=True) as mocked:
            enrollment.delete()
        mocked.assert_called_once_with(enrollment)
