"""
Tests for profile permissions
"""
from unittest.mock import Mock
from django.http import Http404
from django.db.models.signals import post_save
from factory.django import mute_signals
import ddt

from courses.factories import ProgramFactory
from dashboard.models import ProgramEnrollment
from micromasters.factories import UserFactory
from profiles.api import get_social_auth
from profiles.factories import ProfileFactory, SocialProfileFactory
from profiles.models import Profile
from profiles.permissions import (
    CanEditIfOwner,
    CanSeeIfNotPrivate,
)
from roles.models import Role
from roles.roles import (
    Instructor,
    Staff,
)
from search.base import MockedESTestCase


class CanEditIfOwnerTests(MockedESTestCase):
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


@ddt.ddt
class CanSeeIfNotPrivateTests(MockedESTestCase):
    """
    Tests for CanSeeIfNotPrivate permissions
    """

    def setUp(self):
        super(CanSeeIfNotPrivateTests, self).setUp()
        self.user = SocialProfileFactory.create(verified_micromaster_user=False).user
        self.perm = CanSeeIfNotPrivate()

    def get_social_auth_uid(self, user):
        """Helper method to get social_auth uid for a user"""
        return get_social_auth(user).uid

    def test_cant_view_if_privacy_is_private(self):
        """
        Users are not supposed to view private profiles.
        """
        new_profile = SocialProfileFactory.create(account_privacy=Profile.PRIVATE)

        request = Mock(user=self.user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_profile.user)})

        with self.assertRaises(Http404):
            self.perm.has_permission(request, view)

    @ddt.data(Profile.PUBLIC_TO_MM, Profile.PRIVATE)
    def test_cant_view_if_anonymous_user(self, account_privacy_setting):
        """
        Anonymous are not supposed to view public_to_mm or private profiles.
        """
        new_profile = SocialProfileFactory.create(account_privacy=account_privacy_setting)

        request = Mock(user=Mock(is_anonymous=True))
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_profile.user)})

        with self.assertRaises(Http404):
            self.perm.has_permission(request, view)

    def test_can_view_public_if_anonymous_user(self):
        """
        Anonymous can view public profiles.
        """
        new_profile = SocialProfileFactory.create(account_privacy=Profile.PUBLIC)

        request = Mock(user=Mock(is_anonymous=True))
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_profile.user)})

        assert self.perm.has_permission(request, view) is True

    def test_cant_view_if_non_verified_mm_user(self):
        """
        Non verified micromaster users are not supposed to view public_to_mm profiles.
        """
        new_profile = SocialProfileFactory.create(account_privacy=Profile.PUBLIC_TO_MM)

        request = Mock(user=self.user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_profile.user)})

        with self.assertRaises(Http404):
            self.perm.has_permission(request, view)

    def test_cant_view_if_privacy_weird(self):
        """
        Users can not open profiles with ambiguous account_privacy settings.
        """
        new_profile = SocialProfileFactory.create(account_privacy='weird_setting')

        request = Mock(user=self.user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_profile.user)})

        with self.assertRaises(Http404):
            self.perm.has_permission(request, view)

    def test_can_view_own_profile(self):
        """
        Users are allowed to view their own profile.
        """
        request = Mock(user=self.user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(self.user)})

        assert self.perm.has_permission(request, view) is True

    def test_users_can_view_public_profile(self):
        """
        Users are allowed to view public profile.
        """
        new_profile = SocialProfileFactory.create(account_privacy=Profile.PUBLIC)

        request = Mock(user=self.user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_profile.user)})
        assert self.perm.has_permission(request, view) is True

    def test_can_view_if_verified_mm_user(self):
        """
        Verified MM users are allowed to view public_to_mm profile.
        """
        new_user = SocialProfileFactory.create(account_privacy=Profile.PUBLIC_TO_MM).user
        verified_user = SocialProfileFactory.create(verified_micromaster_user=True).user
        program = ProgramFactory.create()
        for user in [new_user, verified_user]:
            ProgramEnrollment.objects.create(
                program=program,
                user=user,
            )

        request = Mock(user=verified_user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_user)})
        assert self.perm.has_permission(request, view) is True

    def test_view_public_to_mm_when_no_common_programs(self):
        """
        Users are not allowed to view public_to_mm profile if there are no common programs.
        """
        new_user = SocialProfileFactory.create(account_privacy=Profile.PUBLIC_TO_MM).user
        verified_user = SocialProfileFactory.create(verified_micromaster_user=True).user

        request = Mock(user=verified_user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_user)})
        with self.assertRaises(Http404):
            self.perm.has_permission(request, view)

    @ddt.data(Staff.ROLE_ID, Instructor.ROLE_ID)
    def test_roles_can_see_profile(self, role_to_set):
        """
        Staff and Instructors can see private profile of user with same program
        """
        # Create a private profile
        new_user = SocialProfileFactory.create(
            verified_micromaster_user=False,
            account_privacy=Profile.PRIVATE,
        ).user
        program = ProgramFactory.create()
        ProgramEnrollment.objects.create(
            program=program,
            user=new_user,
        )

        # Make self.unverified_user a staff of that program
        role = Role.objects.create(
            user=self.user,
            program=program,
            role=role_to_set,
        )
        request = Mock(user=self.user)
        view = Mock(kwargs={'user': self.get_social_auth_uid(new_user)})

        assert self.perm.has_permission(request, view) is True

        # Change role.program and assert that user no longer has permission to see private profile
        role.program = ProgramFactory.create()
        role.save()
        with self.assertRaises(Http404):
            self.perm.has_permission(request, view)
