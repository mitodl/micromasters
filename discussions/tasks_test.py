"""Test for discussions tasks"""

import pytest
from django.db.models.signals import post_save
from factory.django import mute_signals


from discussions import tasks
from discussions.exceptions import DiscussionUserSyncException
from discussions.models import DiscussionUser
from profiles.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_sync_discussion_user_sync_disabled(settings, mocker):
    """Test that sync_discussion_user doesn't call the api if disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    tasks.sync_discussion_user(1234)
    assert mock_api.called is False


def test_sync_discussion_user_sync_enabled(settings, mocker):
    """Test that sync_discussion_user call the api if enabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = True
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    tasks.sync_discussion_user(1234)
    mock_api.assert_called_once_with(1234)


def test_sync_discussion_user_task_api_error(settings, mocker):
    """Test that sync_discussion_user logs errors if they occur"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = True
    mock_log = mocker.patch('discussions.tasks.log')
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    mock_api.side_effect = DiscussionUserSyncException()
    tasks.sync_discussion_user(1234)
    mock_api.assert_called_once_with(1234)
    mock_log.exception.assert_called_once_with("Error syncing user profile")


def test_sync_discussion_users_sync_disabled(settings, mocker):
    """
    Test that sync_discussion_users doesn't call the api if disabled
    """
    UserFactory.create()

    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    tasks.sync_discussion_users()
    assert mock_api.called is False


def test_sync_discussion_userw_sync_enabled(settings, mocker):
    """
    Test that sync_discussion_users call the api if enabled
    and for only users with a profile and not already syncronized
    """
    users = [UserFactory.create() for _ in range(5)]
    user_already_sync = UserFactory.create()
    DiscussionUser.objects.create(user=user_already_sync, username='foo')
    with mute_signals(post_save):
        user_no_profile = UserFactory.create()

    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = True
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    tasks.sync_discussion_users()
    assert mock_api.call_count == len(users)
    for user in users:
        mock_api.assert_any_call(user.id)
    with pytest.raises(AssertionError):
        mock_api.assert_any_call(user_no_profile.id)
    with pytest.raises(AssertionError):
        mock_api.assert_any_call(user_already_sync.id)


def test_sync_discussion_users_task_api_error(settings, mocker):
    """
    Test that sync_discussion_users logs errors if they occur
    """
    user = UserFactory.create()
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = True
    mock_log = mocker.patch('discussions.tasks.log')
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user')
    mock_api.side_effect = DiscussionUserSyncException()
    tasks.sync_discussion_users()
    mock_api.assert_called_once_with(user.id)
    mock_log.error.assert_called_once_with("Impossible to sync user_id %s to discussions", user.id)
