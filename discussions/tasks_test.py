"""Test for discussions tasks"""

import pytest

from discussions import tasks
from discussions.exceptions import DiscussionUserSyncException
from profiles.factories import UserFactory

pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.usefixtures('mocked_on_commit'),
    pytest.mark.django_db,
]


# pylint: disable=unused-argument
def test_sync_discussion_user_sync_disabled(settings, mocker):
    """Test that sync_discussion_user doesn't call the api if disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    tasks.sync_discussion_user(1234)
    assert mock_api.called is False


def test_sync_discussion_user_sync_enabled(mocker):
    """Test that sync_discussion_user call the api if enabled"""
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    tasks.sync_discussion_user(1234)
    mock_api.assert_called_once_with(1234)


def test_sync_discussion_user_task_api_error(mocker):
    """Test that sync_discussion_user logs errors if they occur"""
    mock_log = mocker.patch('discussions.tasks.log')
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    mock_api.side_effect = DiscussionUserSyncException()
    tasks.sync_discussion_user(1234)
    mock_api.assert_called_once_with(1234)
    mock_log.exception.assert_called_once_with("Error syncing user profile")


def test_sync_discussion_users_sync_disabled(settings, mocker, patched_users_api):
    """
    Test that sync_discussion_users doesn't call the api if disabled
    """
    UserFactory.create()

    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    tasks.sync_discussion_users()
    assert mock_api.called is False


def test_sync_discussion_users_sync_enabled(settings, mocker, patched_users_api):
    """
    Test that sync_discussion_users call the api if enabled
    and for only users with a profile and not already syncronized
    """
    users = [UserFactory.create() for _ in range(5)]
    for user in users:
        # Delete DiscussionUser so it will get backfilled
        user.discussion_user.delete()
    user_already_sync = UserFactory.create()
    user_no_profile = UserFactory.create()
    user_no_profile.profile.delete()

    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user', autospec=True)
    tasks.sync_discussion_users()
    assert mock_api.call_count == len(users)
    for user in users:
        mock_api.assert_any_call(user.id)
    with pytest.raises(AssertionError):
        mock_api.assert_any_call(user_no_profile.id)
    with pytest.raises(AssertionError):
        mock_api.assert_any_call(user_already_sync.id)


def test_sync_discussion_users_task_api_error(mocker):
    """
    Test that sync_discussion_users logs errors if they occur
    """
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user', autospec=True)
    user = UserFactory.create()

    # don't count the one triggered by signals on UserFactory.create()
    mock_api.reset_mock()
    mock_log = mocker.patch('discussions.tasks.log', autospec=True)
    mock_api.side_effect = DiscussionUserSyncException()
    tasks.sync_discussion_users()
    mock_api.assert_called_once_with(user.id)
    mock_log.error.assert_called_once_with("Impossible to sync user_id %s to discussions", user.id)


def test_add_users_to_channel_no_feature_flag(settings, mocker):
    """Don't attempt to add users if the feature flag is disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    stub = mocker.patch('discussions.api.add_users_to_channel')
    tasks.add_users_to_channel.delay('channel', [1, 2, 3])
    assert stub.called is False


def test_add_users_to_channel(mocker):
    """add_users_to_channel should forward all arguments to the api function of the same name"""
    stub = mocker.patch('discussions.api.add_users_to_channel', autospec=True)
    tasks.add_users_to_channel.delay('channel', [1, 2, 3])
    stub.assert_called_once_with('channel', [1, 2, 3])
