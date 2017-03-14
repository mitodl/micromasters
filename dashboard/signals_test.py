"""
Tests for signals
"""

from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import ProgramFactory, CourseFactory
from dashboard.models import ProgramEnrollment
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase


class ProgramEnrollmentTests(MockedESTestCase):
    """
    Test indexing on program enrollment
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        with mute_signals(post_save):
            cls.user = ProfileFactory.create().user
            cls.program = ProgramFactory.create()
            cls.course = CourseFactory.create(program=cls.program)

    def setUp(self):
        super().setUp()

        for mock in self.patcher_mocks:
            if mock.name == "_remove_program_enrolled_user":
                self.remove_program_enrolled_user_mock = mock
            elif mock.name == "_index_program_enrolled_users":
                self.index_program_enrolled_users_mock = mock

    def test_create(self):
        """
        Tests that the database is reindexed when a ProgramEnrollment is created
        """
        enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        self.index_program_enrolled_users_mock.assert_called_once_with([enrollment])

    def test_update(self):
        """
        Tests that the database is reindexed when a ProgramEnrollment is created
        """
        with mute_signals(post_save):
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        enrollment.save()
        self.index_program_enrolled_users_mock.assert_called_once_with([enrollment])

    def test_delete(self):
        """
        Tests that if a CachedEnrollment is updated with data=None, the enrollment in the program is not deleted.
        """
        with mute_signals(post_save):
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        enrollment.delete()
        self.remove_program_enrolled_user_mock.assert_called_once_with(enrollment)
