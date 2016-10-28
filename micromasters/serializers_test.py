"""
Tests for serializing Django User objects
"""
import mock
from django.test import TestCase
from django.contrib.auth.models import AnonymousUser
from django.db.models.signals import post_save
from factory.django import mute_signals
from micromasters.serializers import UserSerializer
from micromasters.factories import UserFactory
from profiles.factories import ProfileFactory
from search.base import ESTestCase
# pylint: disable=no-self-use, missing-docstring


class UserTests(ESTestCase):
    """
    Tests for serializing users.
    """
    def test_basic_user(self):
        with mute_signals(post_save):
            user = UserFactory.create(email="fake@example.com")

        result = UserSerializer().to_representation(user)
        assert result == {
            "username": None,
            "email": "fake@example.com",
            "first_name": None,
            "last_name": None,
            "preferred_name": None,
        }

    def test_user_with_profile(self):
        with mute_signals(post_save):
            user = UserFactory.create(email="fake@example.com")
            ProfileFactory.create(
                user=user,
                first_name="Rando",
                last_name="Cardrizzian",
                preferred_name="Hobo",
            )

        result = UserSerializer().to_representation(user)
        assert result == {
            "username": None,
            "email": "fake@example.com",
            "first_name": "Rando",
            "last_name": "Cardrizzian",
            "preferred_name": "Hobo",
        }

    @mock.patch('micromasters.serializers.get_social_username')
    def test_social_username(self, mock_get_username):
        mock_get_username.return_value = "remote"
        with mute_signals(post_save):
            user = UserFactory.create(
                username="local", email="fake@example.com",
            )

        result = UserSerializer().to_representation(user)
        mock_get_username.assert_called_with(user)
        assert result == {
            "username": "remote",
            "email": "fake@example.com",
            "first_name": None,
            "last_name": None,
            "preferred_name": None,
        }


class AnonymousUserTests(TestCase):
    """
    Tests for serializing anonymous users.
    """
    def test_serialize_anonymous_user(self):
        anon_user = AnonymousUser()
        result = UserSerializer().to_representation(anon_user)
        assert result is None
