"""
Tests for utils
"""
import pytest
from django.contrib.auth.models import AnonymousUser
from django.db.models.signals import post_save
from factory.django import mute_signals

from discussions.factories import ChannelProgramFactory
from discussions.models import DiscussionUser
from discussions.utils import get_moderators_for_channel, get_token_for_user
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
    settings.OPEN_DISCUSSIONS_SITE_KEY = 'mm_test'

    mock_encode = mocker.patch('discussions.utils.pyjwt.encode', return_value='token')
    mock_create_user = mocker.patch('discussions.utils.api.create_or_update_discussion_user')

    DiscussionUser.objects.create(user=user, username='username')
    assert get_token_for_user(user) == 'token'
    assert mock_create_user.call_count == 0
    # Verify payload shape (ignore exp/orig_iat values)
    called_payload = mock_encode.call_args[0][0]
    assert called_payload['username'] == user.username
    assert called_payload['roles'] == []
    assert 'exp' in called_payload and 'orig_iat' in called_payload
    assert called_payload['site_key'] == 'mm_test'
    assert called_payload['provider'] == 'micromasters'
    assert mock_encode.call_args[0][1] == 'secret'
    assert mock_encode.call_args[1] == {'algorithm': 'HS256'}


def test_get_token_for_user_force_discussion_user(settings, mocker):
    """
    Assert that get_token_for_user returns a token after forcing DiscussionUser creation
    """
    with mute_signals(post_save):
        user = UserFactory.create()

    settings.OPEN_DISCUSSIONS_JWT_SECRET = 'secret'
    settings.OPEN_DISCUSSIONS_JWT_EXPIRES_DELTA = 3600
    settings.OPEN_DISCUSSIONS_SITE_KEY = 'mm_test'

    mock_encode = mocker.patch('discussions.utils.pyjwt.encode', return_value='token')
    mock_create_user = mocker.patch('discussions.utils.api.create_or_update_discussion_user')
    mock_create_user.return_value = DiscussionUser(user=user, username='username')

    assert get_token_for_user(user, force_create=True) == 'token'
    mock_create_user.assert_called_once_with(user.id)
    called_payload = mock_encode.call_args[0][0]
    assert called_payload['username'] == user.username


def test_get_moderators_for_channel():
    """Test that method return list of moderator ids against given channel name."""
    channel_program = ChannelProgramFactory.create()
    expected_moderators = {RoleFactory.create(program=channel_program.program).user.id for _ in range(5)}

    moderators = get_moderators_for_channel(channel_program.channel.name)
    assert expected_moderators == set(moderators)
