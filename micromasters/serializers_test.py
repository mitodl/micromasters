"""
Tests for serializing Django User objects
"""
from django.contrib.auth.models import AnonymousUser
from django.db.models.signals import post_save
from factory.django import mute_signals
from micromasters.serializers import UserSerializer
from micromasters.factories import UserFactory
from profiles.factories import ProfileFactory
from search.base import ESTestCase
# pylint: disable=no-self-use


class UserTests(ESTestCase):
    "User tests"
    def test_basic(self):
        "Happy path"
        user = UserFactory.create()
        result = UserSerializer().to_representation(user)
        assert result == {
            "username": user.username,
            "email": user.email,
            "first_name": None,
            "last_name": None,
            "preferred_name": None,
            "social_username": None,
            "is_staff": False,
        }

    def test_with_profile(self):
        "Test user with profile"
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        user = profile.user
        result = UserSerializer().to_representation(user)
        assert result == {
            "username": user.username,
            "email": user.email,
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "preferred_name": profile.preferred_name,
            "social_username": None,
            "is_staff": False,
        }

    def test_anonymous_user(self):
        "Anonymous users"
        anon_user = AnonymousUser()
        result = UserSerializer().to_representation(anon_user)
        assert result == None   # noqa # pylint: disable=singleton-comparison
