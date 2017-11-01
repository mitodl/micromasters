"""
Tests for tasks
"""
from datetime import timedelta

from dashboard.tasks import (
    batch_update_user_data,
    LOCK_ID,
)
from micromasters.factories import SocialUserFactory
from micromasters.utils import is_near_now


def test_nothing_to_do(mocker):
    """
    If there's nothing to update batch_update_user_date should only acquire and release the lock
    """
    calc_mock = mocker.patch('dashboard.tasks.calculate_users_to_refresh_in_bulk', autospec=True, return_value=[])
    lock_mock_init = mocker.patch('dashboard.tasks.Lock', autospec=True)
    lock_mock = lock_mock_init.return_value
    token = b'token'
    lock_mock.token = token
    lock_mock.acquire.return_value = True
    refresh_mock = mocker.patch('dashboard.tasks.refresh_user_data', autospec=True)
    release_mock = mocker.patch('dashboard.tasks.release_lock', autospec=True)

    batch_update_user_data()

    assert lock_mock_init.call_args[0][0] == LOCK_ID
    assert is_near_now(lock_mock_init.call_args[0][1] - timedelta(hours=5))
    calc_mock.assert_called_once_with()
    lock_mock.acquire.assert_called_once_with()
    assert refresh_mock.called is False
    assert release_mock.call_count == 1
    release_mock.assert_called_once_with(LOCK_ID, token)


def test_batch_update(mocker, db):  # pylint: disable=unused-argument
    """
    batch_update_user_data should create a group of tasks operating on chunks of users to refresh their caches
    """
    users = SocialUserFactory.create_batch(25)
    calc_mock = mocker.patch('dashboard.tasks.calculate_users_to_refresh_in_bulk', autospec=True, return_value=[
        user.id for user in users
    ])
    lock_mock_init = mocker.patch('dashboard.tasks.Lock', autospec=True)
    lock_mock = lock_mock_init.return_value
    token = b'token'
    lock_mock.token = token
    lock_mock.acquire.return_value = True
    refresh_mock = mocker.patch('dashboard.tasks.refresh_user_data', autospec=True)
    release_mock = mocker.patch('dashboard.tasks.release_lock', autospec=True)

    batch_update_user_data()

    assert lock_mock_init.call_args[0][0] == LOCK_ID
    assert is_near_now(lock_mock_init.call_args[0][1] - timedelta(hours=5))
    calc_mock.assert_called_once_with()
    lock_mock.acquire.assert_called_once_with()
    assert refresh_mock.call_count == len(users)
    for user in users:
        refresh_mock.assert_any_call(user.id)
    release_mock.assert_called_once_with(LOCK_ID, token)


def test_failed_to_acquire(mocker):
    """
    If the lock is held there should be nothing else done
    """
    calc_mock = mocker.patch('dashboard.tasks.calculate_users_to_refresh_in_bulk', autospec=True, return_value=[])
    lock_mock_init = mocker.patch('dashboard.tasks.Lock', autospec=True)
    lock_mock = lock_mock_init.return_value
    lock_mock.acquire.return_value = False
    refresh_mock = mocker.patch('dashboard.tasks.refresh_user_data', autospec=True)
    release_mock = mocker.patch('dashboard.tasks.release_lock', autospec=True)

    batch_update_user_data()

    assert lock_mock_init.call_args[0][0] == LOCK_ID
    assert is_near_now(lock_mock_init.call_args[0][1] - timedelta(hours=5))
    assert calc_mock.called is False
    lock_mock.acquire.assert_called_once_with()
    assert refresh_mock.called is False
    assert release_mock.called is False
