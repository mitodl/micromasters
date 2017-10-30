"""
Tests for tasks
"""
from dashboard.tasks import batch_update_user_data
from micromasters.factories import SocialUserFactory


def test_nothing_to_do(mocker):
    """
    If there's nothing to update batch_update_user_date should only acquire and release the lock
    """
    calc_mock = mocker.patch('dashboard.tasks.calculate_users_to_refresh_in_bulk', autospec=True, return_value=[])
    acquire_mock = mocker.patch('dashboard.tasks._acquire_lock', autospec=True, return_value=True)
    refresh_mock = mocker.patch('dashboard.tasks.refresh_user_data', autospec=True)
    release_mock = mocker.patch('dashboard.tasks._release_lock', autospec=True)

    batch_update_user_data()
    calc_mock.assert_called_once_with()
    acquire_mock.assert_called_once_with()
    assert refresh_mock.called is False
    release_mock.assert_called_once_with()


def test_batch_update(mocker, db):  # pylint: disable=unused-argument
    """
    batch_update_user_data should create a group of tasks operating on chunks of users to refresh their caches
    """
    users = SocialUserFactory.create_batch(25)
    calc_mock = mocker.patch('dashboard.tasks.calculate_users_to_refresh_in_bulk', autospec=True, return_value=[
        user.id for user in users
    ])
    acquire_mock = mocker.patch('dashboard.tasks._acquire_lock', autospec=True, return_value=True)
    refresh_mock = mocker.patch('dashboard.tasks.refresh_user_data', autospec=True)
    release_mock = mocker.patch('dashboard.tasks._release_lock', autospec=True)

    batch_update_user_data()
    calc_mock.assert_called_once_with()
    acquire_mock.assert_called_once_with()
    assert refresh_mock.call_count == len(users)
    for user in users:
        refresh_mock.assert_any_call(user.id)
    release_mock.assert_called_once_with()


def test_failed_to_acquire(mocker):
    """
    If the lock is held there should be nothing else done
    """
    calc_mock = mocker.patch('dashboard.tasks.calculate_users_to_refresh_in_bulk', autospec=True, return_value=[])
    acquire_mock = mocker.patch('dashboard.tasks._acquire_lock', autospec=True, return_value=False)
    refresh_mock = mocker.patch('dashboard.tasks.refresh_user_data', autospec=True)
    release_mock = mocker.patch('dashboard.tasks._release_lock', autospec=True)

    batch_update_user_data()
    assert calc_mock.called is False
    acquire_mock.assert_called_once_with()
    assert refresh_mock.called is False
    assert release_mock.called is False
