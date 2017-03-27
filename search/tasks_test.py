"""Tests for search tasks"""
from dashboard.factories import ProgramEnrollmentFactory
from django.test import override_settings
from search.base import MockedESTestCase
from search.tasks import (
    index_users,
    index_program_enrolled_users,
)


FAKE_INDEX = 'fake'


@override_settings(ELASTICSEARCH_INDEX=FAKE_INDEX)
class SearchTasksTests(MockedESTestCase):
    """
    Tests for search tasks
    """

    def setUp(self):
        super().setUp()

        for mock in self.patcher_mocks:
            if mock.name == "_index_users":
                self.index_users_mock = mock
            elif mock.name == "_index_program_enrolled_users":
                self.index_program_enrolled_users_mock = mock
            elif mock.name == "_send_automatic_emails":
                self.send_automatic_emails_mock = mock

    def test_index_users(self):
        """
        When we run the index_users task we should index user's program enrollments and send them automatic emails
        """
        enrollment1 = ProgramEnrollmentFactory.create()
        enrollment2 = ProgramEnrollmentFactory.create(user=enrollment1.user)
        with self.patch('search.tasks.refresh_index', autospec=True) as refresh_index_mock:
            index_users([enrollment1.user])
        self.index_users_mock.assert_called_with([enrollment1.user])
        for enrollment in [enrollment1, enrollment2]:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
        assert refresh_index_mock.call_count == 1
        refresh_index_mock.assert_called_with(FAKE_INDEX)

    def test_index_program_enrolled_users(self):
        """
        When we run the index_program_enrolled_users task we should index them and send them automatic emails
        """
        enrollments = [ProgramEnrollmentFactory.create() for _ in range(2)]
        with self.patch('search.tasks.refresh_index', autospec=True) as refresh_index_mock:
            index_program_enrolled_users(enrollments)
        self.index_program_enrolled_users_mock.assert_called_with(enrollments)
        for enrollment in enrollments:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
        assert refresh_index_mock.call_count == 1
        refresh_index_mock.assert_called_with(FAKE_INDEX)
