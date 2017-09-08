"""
Tests for utils
"""
from django.contrib.auth.models import AnonymousUser
from django.db.models.signals import post_save

import pytest
from factory.django import mute_signals

from discussions.models import DiscussionUser
from discussions.utils import get_token_for_user
from micromasters.factories import UserFactory

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
    settings.OPEN_DISCUSSIONS_COOKIE_EXPIRES_DELTA = 3600

    mock_get_token = mocker.patch('open_discussions_api.utils.get_token')

    DiscussionUser.objects.create(user=user, username='username')
    assert get_token_for_user(user) is not None
    mock_get_token.assert_called_once_with('secret', 'username', [], expires_delta=3600)