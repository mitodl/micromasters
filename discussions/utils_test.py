"""
Tests for utils
"""
from django.contrib.auth.models import AnonymousUser
from django.db.models.signals import post_save

import pytest
from factory.django import mute_signals

from discussions.factories import ChannelProgramFactory
from discussions.models import DiscussionUser
from discussions.utils import get_token_for_user, get_moderators_for_channel
from micromasters.factories import UserFactory
from roles.factories import RoleFactory

pytestmark = pytest.mark.django_db


def test_get_token_for_user_anonymous():
    """
    Assert that get_token_for_user returns None for an anonymous user
    """
    assert get_token_for_user(AnonymousUser()) is None


def test_get_token_for_user_no_discussion_user():
    """
    Assert that get_token_for_user returns None for a user with no DiscussionUser
    """
    with mute_signals(post_save):
        user = UserFactory.create()

    assert DiscussionUser.objects.count() == 0
    assert get_token_for_user(user) is None


def test_get_token_for_user_no_username():
    """
    Assert that get_token_for_user returns None for a user with no username
    """
    with mute_signals(post_save):
        user = UserFactory.create()

    DiscussionUser.objects.create(user=user, username=None)
    assert get_token_for_user(user) is None


def test_get_token_for_user(settings, mocker):
    """
    Assert that get_token_for_user returns a token for a valid DiscussionUser
    """
    with mute_signals(post_save):
        user = UserFactory.create()

    settings.OPEN_DISCUSSIONS_JWT_SECRET = 'secret'
    settings.OPEN_DISCUSSIONS_JWT_EXPIRES_DELTA = 3600

    mock_get_token = mocker.patch('open_discussions_api.utils.get_token')
    mock_create_user = mocker.patch('discussions.api.create_or_update_discussion_user')

    DiscussionUser.objects.create(user=user, username='username')
    assert get_token_for_user(user) is not None
    mock_get_token.assert_called_once_with(
        'secret',
        user.username,
        [],
        expires_delta=3600,
        extra_payload={
            'site_key': 'mm_test',
            'provider': 'micromasters',
        }
    )
    assert mock_create_user.call_count == 0


def test_get_token_for_user_force_discussion_user(settings, mocker):
    """
    Assert that get_token_for_user returns a token for a valid DiscussionUser
    """
    with mute_signals(post_save):
        user = UserFactory.create()

    settings.OPEN_DISCUSSIONS_JWT_SECRET = 'secret'
    settings.OPEN_DISCUSSIONS_JWT_EXPIRES_DELTA = 3600

    mock_get_token = mocker.patch('open_discussions_api.utils.get_token')
    mock_create_user = mocker.patch('discussions.api.create_or_update_discussion_user')
    mock_create_user.return_value = DiscussionUser(user=user, username='username')

    assert get_token_for_user(user, force_create=True) is not None
    mock_get_token.assert_called_once_with(
        'secret',
        user.username,
        [],
        expires_delta=3600,
        extra_payload={
            'site_key': 'mm_test',
            'provider': 'micromasters',
        }
    )
    assert mock_create_user.called_once_with(user.id)


def test_get_moderators_for_channel():
    """Test that method return list of moderator ids against given channel name."""
    channel_program = ChannelProgramFactory.create()
    expected_moderators = {RoleFactory.create(program=channel_program.program).user.id for _ in range(5)}

    moderators = get_moderators_for_channel(channel_program.channel.name)
    assert expected_moderators == set(moderators)
