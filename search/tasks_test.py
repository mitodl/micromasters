# pylint: disable=redefined-outer-name

"""Tests for search tasks"""
from types import SimpleNamespace

from ddt import (
    data,
    ddt,
    unpack,
)
from django.conf import settings
from django.test import override_settings
import pytest

from dashboard.factories import ProgramEnrollmentFactory
from search.base import MockedESTestCase
from search.exceptions import ReindexException
from search.factories import PercolateQueryFactory
from search.indexing_api import create_backing_indices
from search.models import PercolateQuery
from search.tasks import (
    index_users,
    index_program_enrolled_users, start_recreate_index, bulk_index_percolate_queries, bulk_index_program_enrollments,
    finish_recreate_index,
)


FAKE_INDEX = 'fake'

pytestmark = pytest.mark.django_db


@pytest.fixture
def mocked_celery(mocker):
    """Mock object that patches certain celery functions"""
    exception_class = TabError
    replace_mock = mocker.patch(
        "celery.app.task.Task.replace", autospec=True, side_effect=exception_class
    )
    group_mock = mocker.patch("celery.group", autospec=True)
    chain_mock = mocker.patch("celery.chain", autospec=True)

    yield SimpleNamespace(
        replace=replace_mock,
        group=group_mock,
        chain=chain_mock,
        replace_exception_class=exception_class,
    )


def fail_first():
    """Returns a function which raises an exception the first time then does nothing on subsequent calls"""
    first = False

    def func(*args, **kwargs):  # pylint: disable=unused-argument
        """Raises first time, does nothing subsequent calls"""
        nonlocal first
        if not first:
            first = True
            raise KeyError()
    return func


@ddt
@override_settings(
    OPENSEARCH_INDEX=FAKE_INDEX,
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
            elif mock.name == "_refresh_all_default_indices":
                self.refresh_index_mock = mock
            elif mock.name == "_update_percolate_memberships":
                self.update_percolate_memberships_mock = mock

    def test_index_users(self):
        """
        When we run the index_users task we should index user's program enrollments and send them automatic emails
        """
        enrollment1 = ProgramEnrollmentFactory.create()
        enrollment2 = ProgramEnrollmentFactory.create(user=enrollment1.user)
        index_users([enrollment1.user.id])
        assert self.index_program_enrolled_users_mock.call_count == 1
        assert sorted(
            self.index_program_enrolled_users_mock.call_args[0][0],
            key=lambda _enrollment: _enrollment.id
        ) == sorted(
            [enrollment1, enrollment2],
            key=lambda _enrollment: _enrollment.id
        )
        for enrollment in [enrollment1, enrollment2]:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
            self.update_percolate_memberships_mock.assert_any_call(
                enrollment.user, PercolateQuery.DISCUSSION_CHANNEL_TYPE)
        self.refresh_index_mock.assert_called_with()

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
                self.update_percolate_memberships_mock.assert_any_call(
                    enrollment.user, PercolateQuery.DISCUSSION_CHANNEL_TYPE)
        else:
            assert self.index_program_enrolled_users_mock.called is False
            assert self.send_automatic_emails_mock.called is False

    def test_index_program_enrolled_users(self):
        """
        When we run the index_program_enrolled_users task we should index them and send them automatic emails
        """
        enrollments = [ProgramEnrollmentFactory.create() for _ in range(2)]
        enrollment_ids = [enrollment.id for enrollment in enrollments]

        index_program_enrolled_users(enrollment_ids)
        assert list(
            self.index_program_enrolled_users_mock.call_args[0][0].values_list('id', flat=True)
        ) == enrollment_ids
        for enrollment in enrollments:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
            self.update_percolate_memberships_mock.assert_any_call(
                enrollment.user, PercolateQuery.DISCUSSION_CHANNEL_TYPE)
        self.refresh_index_mock.assert_called_with()

    def test_failed_automatic_email(self):
        """
        If we fail to send automatic email for one enrollment we should still send them for other enrollments
        """
        enrollments = [ProgramEnrollmentFactory.create() for _ in range(2)]
        enrollment_ids = [enrollment.id for enrollment in enrollments]

        self.send_automatic_emails_mock.side_effect = fail_first()

        index_program_enrolled_users(enrollment_ids)
        assert list(
            self.index_program_enrolled_users_mock.call_args[0][0].values_list('id', flat=True)
        ) == enrollment_ids
        for enrollment in enrollments:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
            self.update_percolate_memberships_mock.assert_any_call(
                enrollment.user, PercolateQuery.DISCUSSION_CHANNEL_TYPE
            )
        assert self.send_automatic_emails_mock.call_count == len(enrollments)
        assert self.update_percolate_memberships_mock.call_count == len(enrollments)
        self.refresh_index_mock.assert_called_with()

    def test_failed_update_percolate_memberships(self):
        """
        If we fail to update percolate memberships for one enrollment we should still update it for other enrollments
        """
        enrollments = [ProgramEnrollmentFactory.create() for _ in range(2)]
        enrollment_ids = [enrollment.id for enrollment in enrollments]

        self.update_percolate_memberships_mock.side_effect = fail_first()

        index_program_enrolled_users(enrollment_ids)
        assert list(
            self.index_program_enrolled_users_mock.call_args[0][0].values_list('id', flat=True)
        ) == enrollment_ids

        for enrollment in enrollments:
            self.send_automatic_emails_mock.assert_any_call(enrollment)
            self.update_percolate_memberships_mock.assert_any_call(
                enrollment.user, PercolateQuery.DISCUSSION_CHANNEL_TYPE
            )
        assert self.send_automatic_emails_mock.call_count == len(enrollments)
        assert self.update_percolate_memberships_mock.call_count == len(enrollments)
        self.refresh_index_mock.assert_called_with()


def test_start_recreate_index(mocker, mocked_celery):
    """
    recreate_index should recreate the opensearch index and reindex all data with it
    """
    settings.OPENSEARCH_INDEXING_CHUNK_SIZE = 2
    enrollments = sorted(ProgramEnrollmentFactory.create_batch(4), key=lambda enrollment: enrollment.id)
    percolates = sorted(PercolateQueryFactory.create_batch(4), key=lambda percolate: percolate.id)
    index_enrollments_mock = mocker.patch("search.tasks.bulk_index_program_enrollments", autospec=True)
    index_percolates_mock = mocker.patch("search.tasks.bulk_index_percolate_queries", autospec=True)

    test_backing_indices = create_backing_indices()
    enrollment_public_index = test_backing_indices[0][0]
    enrollment_private_index = test_backing_indices[1][0]
    percolate_index = test_backing_indices[2][0]

    finish_recreate_index_mock = mocker.patch(
        "search.tasks.finish_recreate_index", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        start_recreate_index(test_backing_indices)

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])
    assert mocked_celery.group.call_count == 1

    finish_recreate_index_mock.s.assert_called_once_with(test_backing_indices)

    assert index_enrollments_mock.si.call_count == 2
    index_enrollments_mock.si.assert_any_call([enrollments[0].id, enrollments[1].id], enrollment_public_index,
                                              enrollment_private_index)
    index_enrollments_mock.si.assert_any_call([enrollments[2].id, enrollments[3].id], enrollment_public_index,
                                              enrollment_private_index)

    assert index_percolates_mock.si.call_count == 2
    index_percolates_mock.si.assert_any_call([percolates[0].id, percolates[1].id], percolate_index)
    index_percolates_mock.si.assert_any_call([percolates[2].id, percolates[3].id], percolate_index)

    assert mocked_celery.replace.call_count == 1
    assert mocked_celery.replace.call_args[0][1] == mocked_celery.chain.return_value


def test_bulk_index_program_enrollments(mocker):
    """
    bulk_index_program_enrollments should index the user program enrollments correctly
    """
    enrollments = ProgramEnrollmentFactory.create_batch(2)
    enrollment_ids = [enrollment.id for enrollment in enrollments]
    index_enrollments_mock = mocker.patch("search.tasks._index_program_enrolled_users", autospec=True)

    test_backing_indices = create_backing_indices()
    enrollment_public_index = test_backing_indices[0][0]
    enrollment_private_index = test_backing_indices[1][0]
    bulk_index_program_enrollments(enrollment_ids, enrollment_public_index, enrollment_private_index)
    assert index_enrollments_mock.call_count == 1


def test_bulk_index_percolate_queries(mocker):
    """
    bulk_index_percolate_queries should index the percolate queries correctly
    """
    percolates = PercolateQueryFactory.create_batch(2)
    percolate_ids = [percolate.id for percolate in percolates]

    percolate_index_chunk_mock = mocker.patch("search.tasks._index_chunks", autospec=True)

    test_backing_indices = create_backing_indices()
    percolate_index = test_backing_indices[2][0]
    bulk_index_percolate_queries(percolate_ids, percolate_index)
    assert percolate_index_chunk_mock.call_count == 1


@pytest.mark.parametrize("with_error", [True, False])
def test_finish_recreate_index(mocker, with_error):
    """
    finish_recreate_index should clear and delete all the backing indices
    """
    refresh_index_mock = mocker.patch("search.tasks.refresh_index", autospec=True)
    delete_backing_indices_mock = mocker.patch("search.tasks.delete_backing_indices", autospec=True)
    results = ["error"] if with_error else []
    test_backing_indices = create_backing_indices()

    if with_error:
        with pytest.raises(ReindexException):
            finish_recreate_index(results, test_backing_indices)
        assert delete_backing_indices_mock.call_count == 1
    else:
        finish_recreate_index(results, test_backing_indices)
        assert refresh_index_mock.call_count == len(test_backing_indices)
        assert delete_backing_indices_mock.call_count == 1
