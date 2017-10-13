"""Tests for search tasks"""
from ddt import (
    data,
    ddt,
    unpack,
)
from django.test import override_settings

from dashboard.factories import ProgramEnrollmentFactory
from search.base import MockedESTestCase
from search.indexing_api import get_default_alias
from search.tasks import (
    index_users,
    index_program_enrolled_users,
)


FAKE_INDEX = 'fake'


@ddt
@override_settings(
    ELASTICSEARCH_INDEX=FAKE_INDEX,
    OPEN_DISCUSSIONS_JWT_SECRET='secret',
    OPEN_DISCUSSIONS_BASE_URL='http://fake',
    OPEN_DISCUSSIONS_API_USERNAME='mitodl',
)
class SearchTasksTests(MockedESTestCase):
    """
    Tests for search tasks
    """

    def setUp(self):
        super().setUp()

        for mock in self.patcher_mocks:
            if mock.name == "_index_program_enrolled_users":
                self.index_program_enrolled_users_mock = mock
            elif mock.name == "_document_needs_updating":
                self.document_needs_updating_mock = mock
            elif mock.name == "_send_automatic_emails":
                self.send_automatic_emails_mock = mock
            elif mock.name == "_refresh_index":
                self.refresh_index_mock = mock
            elif mock.name == "_sync_user_to_channels":
                self.sync_user_to_channels_mock = mock

    @data(True, False)
    def test_index_users(self, sync_feature_flag):
        """
        When we run the index_users task we should index user's program enrollments and send them automatic emails
        """
        enrollment1 = ProgramEnrollmentFactory.create()
        enrollment2 = ProgramEnrollmentFactory.create(user=enrollment1.user)
        with self.settings(FEATURES={"OPEN_DISCUSSIONS_USER_SYNC": sync_feature_flag}):
            index_users([enrollment1.user.id])
            self.index_program_enrolled_users_mock.assert_called_once_with([enrollment1, enrollment2])
            for enrollment in [enrollment1, enrollment2]:
                self.send_automatic_emails_mock.assert_any_call(enrollment)
                if sync_feature_flag:
                    self.sync_user_to_channels_mock.assert_any_call(enrollment.user.id)
            self.refresh_index_mock.assert_called_with(get_default_alias())

    @data(*[
        [True, True],
        [True, False],
        [False, True],
        [False, False],
    ])
    @unpack
    def test_index_users_check_if_changed(self, enrollment1_needs_update, enrollment2_needs_update):
        """
        If check_if_changed is true we should only update documents which need updating
        """
        enrollment1 = ProgramEnrollmentFactory.create()
        enrollment2 = ProgramEnrollmentFactory.create()

        needs_update_list = []
        if enrollment1_needs_update:
            needs_update_list.append(enrollment1)
        if enrollment2_needs_update:
            needs_update_list.append(enrollment2)

        def fake_needs_updating(_enrollment):
            """Fake document_needs_update to conform to test data"""
            return _enrollment in needs_update_list

        self.document_needs_updating_mock.side_effect = fake_needs_updating
        index_users([enrollment1.user.id, enrollment2.user.id], check_if_changed=True)

        expected_enrollments = []
        if enrollment1_needs_update:
            expected_enrollments.append(enrollment1)
        if enrollment2_needs_update:
            expected_enrollments.append(enrollment2)

        self.document_needs_updating_mock.assert_any_call(enrollment1)
        self.document_needs_updating_mock.assert_any_call(enrollment2)
        if len(needs_update_list) > 0:
            self.index_program_enrolled_users_mock.assert_called_once_with(needs_update_list)
            for enrollment in needs_update_list:
                self.send_automatic_emails_mock.assert_any_call(enrollment)
        else:
            assert self.index_program_enrolled_users_mock.called is False
            assert self.send_automatic_emails_mock.called is False

    @data(True, False)
    def test_index_program_enrolled_users(self, sync_feature_flag):
        """
        When we run the index_program_enrolled_users task we should index them and send them automatic emails
        """
        enrollments = [ProgramEnrollmentFactory.create() for _ in range(2)]
        enrollment_ids = [enrollment.id for enrollment in enrollments]

        with self.settings(FEATURES={"OPEN_DISCUSSIONS_USER_SYNC": sync_feature_flag}):
            index_program_enrolled_users(enrollment_ids)
            assert list(
                self.index_program_enrolled_users_mock.call_args[0][0].values_list('id', flat=True)
            ) == enrollment_ids
            for enrollment in enrollments:
                self.send_automatic_emails_mock.assert_any_call(enrollment)
                if sync_feature_flag:
                    self.sync_user_to_channels_mock.assert_any_call(enrollment.user.id)
            self.refresh_index_mock.assert_called_with(get_default_alias())
