"""
Tests for profile permissions
"""
from mock import Mock
from django.http import Http404
from django.db.models.signals import post_save
from django.test import TestCase
from factory.django import mute_signals

from backends.edxorg import EdxOrgOAuth2
from profiles.factories import (
    ProfileFactory,
    UserFactory,
)
from profiles.models import Profile
from profiles.permissions import (
    CanEditIfOwner,
    CanSeeIfNotPrivate,
)


# pylint: disable=no-self-use
class CanEditIfOwnerTests(TestCase):
    """
    Tests for CanEditIfOwner permissions
    """

    def test_allow_nonedit(self):
        """
        Users are allowed to use safe methods without owning the profile.
        """
        perm = CanEditIfOwner()
        for method in ('GET', 'HEAD', 'OPTIONS'):
            request = Mock(method=method)
            with mute_signals(post_save):
                profile = ProfileFactory.create()
            assert perm.has_object_permission(request, None, profile)

    def test_edit_if_owner(self):
        """
        Users are allowed to edit their own profile
        """
        perm = CanEditIfOwner()
        for method in ('POST', 'PATCH', 'PUT'):
            with mute_signals(post_save):
                profile = ProfileFactory.create()
            request = Mock(method=method, user=profile.user)
            assert perm.has_object_permission(request, None, profile)

    def test_cant_edit_if_not_owner(self):
        """
        Users are not allowed to edit if it's not their profile.
        """
        perm = CanEditIfOwner()
        other_user = UserFactory.create()
        for method in ('POST', 'PATCH', 'PUT'):
            with mute_signals(post_save):
                profile = ProfileFactory.create(account_privacy=Profile.PUBLIC_TO_MM)

            request = Mock(method=method, user=other_user)
            assert not perm.has_object_permission(request, None, profile)


# pylint: disable=no-self-use
class CanSeeIfNotPrivateTests(TestCase):
    """
    Tests for CanSeeIfNotPrivate permissions
    """

    def setUp(self):
        super(CanSeeIfNotPrivateTests, self).setUp()
        with mute_signals(post_save):
            self.other_user = other_user = UserFactory.create()
            username = "{}_edx".format(other_user.username)
            social_auth = other_user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=username
            )
            self.other_user_id = social_auth.uid
            ProfileFactory.create(user=other_user, verified_micromaster_user=False)

        with mute_signals(post_save):
            self.profile_user = profile_user = UserFactory.create()
            username = "{}_edx".format(profile_user.username)
            social_auth = profile_user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=username
            )
            self.profile_user_id = social_auth.uid

    def test_cant_view_if_privacy_is_private(self):
        """
        Users are not supposed to view private profiles.
        """
        perm = CanSeeIfNotPrivate()

        with mute_signals(post_save):
            ProfileFactory.create(user=self.profile_user, account_privacy=Profile.PRIVATE)

        request = Mock(user=self.other_user)
        view = Mock(kwargs={'user': self.profile_user_id})

        with self.assertRaises(Http404):
            perm.has_permission(request, view)

    def test_cant_view_if_anonymous_user(self):
        """
        Anonymous are not supposed to view public_to_mm profiles.
        """
        perm = CanSeeIfNotPrivate()
        with mute_signals(post_save):
            ProfileFactory.create(user=self.profile_user, account_privacy=Profile.PUBLIC_TO_MM)

        request = Mock(user=Mock(is_anonymous=Mock(return_value=True)))
        view = Mock(kwargs={'user': self.profile_user_id})

        with self.assertRaises(Http404):
            perm.has_permission(request, view)

    def test_cant_view_if_non_verified_mm_user(self):
        """
        Non verified micromaster users are not supposed to view public_to_mm profiles.
        """
        perm = CanSeeIfNotPrivate()
        with mute_signals(post_save):
            ProfileFactory.create(user=self.profile_user, account_privacy=Profile.PUBLIC_TO_MM)

        request = Mock(user=self.other_user)
        view = Mock(kwargs={'user': self.profile_user_id})

        with self.assertRaises(Http404):
            perm.has_permission(request, view)

    def test_cant_view_if_privacy_weird(self):
        """
        Users can not open profiles with ambiguous account_privacy settings.
        """
        perm = CanSeeIfNotPrivate()
        with mute_signals(post_save):
            ProfileFactory.create(user=self.profile_user, account_privacy='weird_setting')

        request = Mock(user=self.other_user)
        view = Mock(kwargs={'user': self.profile_user_id})

        with self.assertRaises(Http404):
            perm.has_permission(request, view)

    def test_can_view_own_profile(self):
        """
        Users are allowed to view their own profile.
        """
        perm = CanSeeIfNotPrivate()
        request = Mock(user=self.other_user)
        view = Mock(kwargs={'user': self.other_user_id})

        assert perm.has_permission(request, view) is True

    def test_users_can_view_public_profile(self):
        """
        Users are allowed to view public profile.
        """
        perm = CanSeeIfNotPrivate()
        with mute_signals(post_save):
            ProfileFactory.create(user=self.profile_user, account_privacy=Profile.PUBLIC)

        request = Mock(user=self.other_user)
        view = Mock(kwargs={'user': self.profile_user_id})
        assert perm.has_permission(request, view) is True

    def test_can_view_if_verified_mm_user(self):
        """
        Verified MM users are allowed to view public_to_mm profile.
        """
        perm = CanSeeIfNotPrivate()
        with mute_signals(post_save):
            ProfileFactory.create(user=self.profile_user, account_privacy=Profile.PUBLIC_TO_MM)

        with mute_signals(post_save):
            verified_user = UserFactory.create()
            username = "{}_edx".format(verified_user.username)
            verified_user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=username
            )
            ProfileFactory.create(user=verified_user, verified_micromaster_user=True)

        request = Mock(user=verified_user)
        view = Mock(kwargs={'user': self.profile_user_id})
        assert perm.has_permission(request, view) is True
