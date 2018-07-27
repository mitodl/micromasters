"""Test for discussions signals"""
from django.db.models.signals import post_save

import pytest
from factory.django import mute_signals

from profiles.factories import ProfileFactory
from micromasters.factories import UserFactory
from roles.factories import RoleFactory

pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.usefixtures('mocked_on_commit'),
    pytest.mark.django_db,
]


# pylint: disable=unused-argument
def test_sync_user_profile_disabled(settings, mocker):
    """Test that sync_user_profile doesn't call the api if disabled"""
    settings.FEATURES['OPEN_DISCUSSIONS_USER_SYNC'] = False
    mock_task = mocker.patch('discussions.tasks.sync_discussion_user')
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    profile.save()
    assert mock_task.delay.called is False


def test_sync_user_profile_create_enabled(mocker):
    """Test that sync_user_profile calls the task if enabled on create"""
    mock_task = mocker.patch('discussions.tasks.sync_discussion_user')
    user = UserFactory.create()
    mock_task.delay.assert_called_with(user.id)


def test_sync_user_profile_save_enabled(mocker, patched_users_api):
    """Test that sync_user_profile calls the task if enabled on save"""
    mock_task = mocker.patch('discussions.tasks.sync_discussion_user')
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    profile.save()
    mock_task.delay.assert_called_once_with(profile.user_id)


def test_add_staff_as_moderator_enabled(mocker, patched_users_api):
    """Test that add_staff_as_moderator calls the task if enabled on save"""
    mock_task = mocker.patch('discussions.tasks.add_user_as_moderator_to_channel')
    with mute_signals(post_save):
        profile = ProfileFactory.create()
        role = RoleFactory.create(user=profile.user)
    role.save()
    mock_task.delay.assert_called_once_with(role.user_id, role.program_id)


def test_delete_staff_as_moderator_enabled(mocker, patched_users_api):
    """Test that remove_user_as_moderator_to_channel calls the task if enabled on save"""
    mock_task = mocker.patch('discussions.tasks.remove_user_as_moderator_from_channel')
    with mute_signals(post_save):
        profile = ProfileFactory.create()
        role = RoleFactory.create(user=profile.user)
    role.delete()
    mock_task.delay.assert_called_once_with(role.user_id, role.program_id)
