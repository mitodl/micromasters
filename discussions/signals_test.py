"""Test for discussions signals"""
from django.db.models.signals import post_save

import pytest
from factory.django import mute_signals

from profiles.factories import ProfileFactory
from micromasters.factories import UserFactory

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
