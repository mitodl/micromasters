"""Test for discussions tasks"""
from datetime import timedelta

import pytest
from django.db.models.signals import post_save
from factory.django import mute_signals

from discussions import tasks
from discussions.factories import ChannelProgramFactory, DiscussionUserFactory
from discussions.exceptions import DiscussionUserSyncException
from profiles.factories import UserFactory
from micromasters.utils import (
    is_near_now,
    now_in_utc,
)

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


def test_sync_discussion_users_sync_with_email_optin_enabled(settings, mocker, patched_users_api):
    """
    Test that sync_discussion_users call the api if enabled
    and for only users with a profile and not already synchronized
    """
    users = [UserFactory.create() for _ in range(5)]
    for user in users[1:]:
        # Delete DiscussionUser so it will get backfilled
        user.discussion_user.delete()
    user_no_profile = UserFactory.create()
    user_no_profile.profile.delete()

    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user', autospec=True)
    tasks.force_sync_discussion_users()
    assert mock_api.call_count == len(users)
    for user in users:
        mock_api.assert_any_call(user.id, allow_email_optin=True)
    with pytest.raises(AssertionError):
        mock_api.assert_any_call(user_no_profile.id, allow_email_optin=True)


def test_sync_discussion_users_with_email_optin_enabled_no_feature_flag(settings, mocker, patched_users_api):
    """
    Test that sync_discussion_users does not call the api when
    OPEN_DISCUSSIONS_USER_SYNC flag is off
    """
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    api_stub = mocker.patch('discussions.api.create_or_update_discussion_user', autospec=True)
    tasks.force_sync_discussion_users.delay()
    assert api_stub.call_count == 0


def test_force_sync_discussion_users_task_api_error(mocker):
    """
    Test that sync_discussion_users logs errors if they occur
    """
    mock_api = mocker.patch('discussions.api.create_or_update_discussion_user', autospec=True)
    user = UserFactory.create()

    # don't count the one triggered by signals on UserFactory.create()
    mock_api.reset_mock()
    mock_log = mocker.patch('discussions.tasks.log', autospec=True)
    mock_api.side_effect = DiscussionUserSyncException()
    tasks.force_sync_discussion_users()
    mock_api.assert_called_once_with(user.id, allow_email_optin=True)
    mock_log.error.assert_called_once_with("Impossible to sync user_id %s to discussions", user.id)


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


def test_add_moderators_to_channel(mocker):
    """add_moderators_to_channel should forward all arguments to the api function"""
    stub = mocker.patch('discussions.api.add_moderators_to_channel', autospec=True)
    tasks.add_moderators_to_channel.delay('channel')
    stub.assert_called_once_with('channel')


def test_add_moderators_to_channel_no_feature_flag(settings, mocker):
    """add_moderators_to_channel should not call the api function if the feature flag is disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    stub = mocker.patch('discussions.api.add_moderators_to_channel', autospec=True)
    tasks.add_moderators_to_channel.delay('channel')
    assert stub.called is False


def test_sync_channel_memberships(settings, mocker):
    """sync_channel_memberships should forward all arguments to the api function"""

    def acquire_func(lock):
        """Fake a lock acquisition"""
        lock.acquired = True

    acquire_stub = mocker.patch('discussions.tasks.Lock.acquire', autospec=True, side_effect=acquire_func)
    release_stub = mocker.patch('discussions.tasks.Lock.release', autospec=True)

    expected_membership_ids = [1, 2, 3]
    get_memberships_stub = mocker.patch(
        'discussions.api.get_membership_ids_needing_sync',
        autospec=True,
        return_value=expected_membership_ids
    )

    def assert_memberships(membership_ids):
        """Asserts the generator passed into sync_channel_memberships can evaluate"""
        assert list(membership_ids) == expected_membership_ids

    api_stub = mocker.patch(
        'discussions.api.sync_channel_memberships',
        autospec=True,
        side_effect=assert_memberships
    )
    tasks.sync_channel_memberships.delay()
    assert api_stub.call_count == 1
    assert get_memberships_stub.call_count == 1
    assert acquire_stub.called is True
    assert release_stub.called is True


def test_sync_channel_memberships_lock_name(settings, mocker):
    """sync_channel_memberships should use the proper lock name and expiration"""

    lock_mock = mocker.patch('discussions.tasks.Lock', autospec=True)

    tasks.sync_channel_memberships.delay()
    assert lock_mock.call_count == 1
    assert lock_mock.call_args[0][0] == tasks.SYNC_MEMBERSHIPS_LOCK_NAME
    assert is_near_now(lock_mock.call_args[0][1] - timedelta(seconds=tasks.SYNC_MEMBERSHIPS_LOCK_TTL_SECONDS))


def test_sync_channel_memberships_generator(settings, mocker):
    """sync_channel_memberships internal generator should stop when the lock times out"""
    now_in_utc_stub = mocker.patch(
        'micromasters.locks.now_in_utc',
        autospec=True,
        side_effect=[
            # call when we determine end_time
            now_in_utc(),
            # first call to generator
            now_in_utc(),
            # this should cause the internal _get_memberships generator to stop yielding
            now_in_utc() + timedelta(minutes=5),
        ]
    )

    def acquire_func(lock):
        """Fake a lock acquisition"""
        lock.acquired = True

    acquire_stub = mocker.patch('discussions.tasks.Lock.acquire', autospec=True, side_effect=acquire_func)
    release_stub = mocker.patch('discussions.tasks.Lock.release', autospec=True)

    expected_membership_ids = [1, 2, 3]
    get_memberships_stub = mocker.patch(
        'discussions.api.get_membership_ids_needing_sync',
        autospec=True,
        return_value=expected_membership_ids
    )

    def assert_memberships(membership_ids):
        """Asserts the generator passed into sync_channel_memberships can evaluate"""
        # this should only be the first two items
        assert list(membership_ids) == expected_membership_ids[:1]

    api_stub = mocker.patch(
        'discussions.api.sync_channel_memberships',
        autospec=True,
        side_effect=assert_memberships
    )
    tasks.sync_channel_memberships.delay()
    assert now_in_utc_stub.call_count == 3
    assert api_stub.call_count == 1
    assert get_memberships_stub.call_count == 1
    assert acquire_stub.called is True
    assert release_stub.called is True


def test_sync_channel_memberships_no_lock(settings, mocker):
    """sync_channel_memberships exit without calling the api method if no lock"""
    acquire_stub = mocker.patch('discussions.tasks.Lock.acquire', autospec=False, return_value=False)
    release_stub = mocker.patch('discussions.tasks.Lock.release', autospec=True)

    def assert_memberships(membership_ids):
        """Asserts the generator passed into sync_channel_memberships can evaluate"""
        # this should only be the first two items
        assert list(membership_ids) == []

    api_stub = mocker.patch('discussions.api.sync_channel_memberships', autospec=True, side_effect=assert_memberships)
    tasks.sync_channel_memberships.delay()
    assert api_stub.call_count == 1
    assert acquire_stub.called is True
    assert release_stub.called is True


def test_sync_channel_memberships_no_feature_flag(settings, mocker):
    """sync_channel_memberships should not call the api function if the feature flag is disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    api_stub = mocker.patch('discussions.api.sync_channel_memberships', autospec=True)
    tasks.sync_channel_memberships.delay()
    assert api_stub.call_count == 0


def test_add_moderator_to_channel(mocker):
    """add_moderator_to_channels should forward all arguments to the api function"""
    stub = mocker.patch('discussions.api.add_and_subscribe_moderator', autospec=True)
    program = ChannelProgramFactory.create().program
    with mute_signals(post_save):
        discussion_user = DiscussionUserFactory.create()
    tasks.add_user_as_moderator_to_channel.delay(discussion_user.user_id, program.id)
    assert stub.called is True


def test_add_moderator_to_channel_no_feature_flag(settings, mocker):
    """add_moderator_to_channels should not call the api function if the feature flag is disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    stub = mocker.patch('discussions.api.add_and_subscribe_moderator', autospec=True)
    program = ChannelProgramFactory.create().program
    with mute_signals(post_save):
        discussion_user = DiscussionUserFactory.create()
    tasks.add_user_as_moderator_to_channel.delay(discussion_user.user_id, program.id)
    assert stub.called is False


def test_remove_moderator_to_channel(mocker):
    """add_moderator_to_channels should forward all arguments to the api function"""
    stub = mocker.patch('discussions.api.remove_moderator_from_channel', autospec=True)
    program = ChannelProgramFactory.create().program
    with mute_signals(post_save):
        discussion_user = DiscussionUserFactory.create()
    tasks.remove_user_as_moderator_from_channel.delay(discussion_user.user_id, program.id)
    assert stub.called is True


def test_remove_moderator_to_channel_no_feature_flag(settings, mocker):
    """add_moderator_to_channels should not call the api function if the feature flag is disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    stub = mocker.patch('discussions.api.remove_moderator_from_channel', autospec=True)
    program = ChannelProgramFactory.create().program
    with mute_signals(post_save):
        discussion_user = DiscussionUserFactory.create()
    tasks.remove_user_as_moderator_from_channel.delay(discussion_user.user_id, program.id)
    assert stub.called is False


def test_remove_moderators_from_channel(mocker):
    """remove_moderators_from_channel should forward all arguments to the api function"""
    stub = mocker.patch('discussions.api.remove_moderator_from_channel', autospec=True)
    program = ChannelProgramFactory.create().program
    with mute_signals(post_save):
        discussion_user = DiscussionUserFactory.create()
    tasks.remove_user_as_moderator_from_channel.delay(discussion_user.user_id, program.id)
    assert stub.called is True
