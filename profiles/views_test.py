"""
Tests for profile view
"""
import json
from mock import patch

from dateutil.parser import parse
from django.core.urlresolvers import resolve, reverse
from django.db.models.signals import post_save
from factory.django import mute_signals
from rest_framework.fields import (
    DateField,
    ReadOnlyField,
    SerializerMethodField,
)
from rest_framework.serializers import ListSerializer
from rest_framework.status import (
    HTTP_405_METHOD_NOT_ALLOWED,
    HTTP_404_NOT_FOUND
)

from backends.edxorg import EdxOrgOAuth2
from courses.factories import ProgramFactory
from dashboard.models import ProgramEnrollment
from micromasters.factories import UserFactory
from profiles.factories import ProfileFactory
from profiles.models import Profile
from profiles.permissions import (
    CanEditIfOwner,
    CanSeeIfNotPrivate,
)
from profiles.serializers import (
    ProfileFilledOutSerializer,
    ProfileLimitedSerializer,
    ProfileSerializer,
)
from profiles.views import ProfileViewSet
from roles.models import Role
from roles.roles import (
    Instructor,
    Staff,
)
from search.base import ESTestCase


def format_image_expectation(profile):
    """formats a profile image to match what will be in JSON"""
    profile["image"] = "http://testserver{}".format(profile["image"])
    return profile


class ProfileBaseTests(ESTestCase):
    """
    Tests for profile views
    """

    @classmethod
    def setUpTestData(cls):
        """
        Create a user
        """
        with mute_signals(post_save):
            cls.user1 = UserFactory.create()
            username = "{}_edx".format(cls.user1.username)
            cls.user1.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=username
            )
        cls.url1 = reverse('profile-detail', kwargs={'user': username})

        with mute_signals(post_save):
            cls.user2 = UserFactory.create()
            username = "{}_edx".format(cls.user2.username)
            cls.user2.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=username
            )
        cls.url2 = reverse('profile-detail', kwargs={'user': username})


class ProfileGETTests(ProfileBaseTests):
    """Tests for GET requests on profiles"""
    def test_viewset(self):
        """
        Assert that the URL links up with the viewset
        """
        view = resolve(self.url1)
        assert view.func.cls is ProfileViewSet

    def test_permissions(self):  # pylint: disable=no-self-use
        """
        Assert that we set permissions correctly
        """
        assert set(ProfileViewSet.permission_classes) == {CanEditIfOwner, CanSeeIfNotPrivate}

    def test_check_object_permissions(self):
        """
        Make sure check_object_permissions is called at some point so the permissions work correctly
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user1, account_privacy=Profile.PUBLIC)
        self.client.force_login(self.user1)

        with patch.object(ProfileViewSet, 'check_object_permissions', autospec=True) as check_object_permissions:
            self.client.get(self.url1)
        assert check_object_permissions.called

    def test_get_own_profile(self):
        """
        Get a user's own profile. This should work no matter what setting is in
        account_privacy.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user1)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url1)
        assert resp.json() == format_image_expectation(
            ProfileSerializer().to_representation(profile)
        )

    def test_anonym_user_get_public_profile(self):
        """
        An anonymous user gets another user's public profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC)
        self.client.logout()
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_mm_user_get_public_profile(self):
        """
        An unverified mm user gets another user's public profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_vermm_user_get_public_profile(self):
        """
        A verified mm user gets another user's public profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_anonym_user_get_public_to_mm_profile(self):
        """
        An anonymous user gets user's public_to_mm profile.
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC_TO_MM)
        self.client.logout()
        resp = self.client.get(self.url2)
        assert resp.status_code == HTTP_404_NOT_FOUND

    def test_mm_user_get_public_to_mm_profile(self):
        """
        An unverified mm user gets user's public_to_mm profile.
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC_TO_MM)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.status_code == HTTP_404_NOT_FOUND

    def test_vermm_user_get_public_to_mm_profile(self):
        """
        A verified mm user gets  user's public_to_mm profile.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PUBLIC_TO_MM)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == ProfileLimitedSerializer().to_representation(profile)

    def test_anonym_user_get_private_profile(self):
        """
        An anonymous user gets user's private profile
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
        self.client.logout()
        resp = self.client.get(self.url2)
        assert resp.status_code == HTTP_404_NOT_FOUND

    def test_mm_user_get_private_profile(self):
        """
        An unverified mm user gets user's private profile
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.status_code == HTTP_404_NOT_FOUND

    def test_vermm_user_get_private_profile(self):
        """
        A verified mm user gets user's private profile
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.status_code == HTTP_404_NOT_FOUND

    def test_weird_privacy_get_private_profile(self):
        """
        If a user profile has a weird profile setting, it defaults to private
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user2, account_privacy='weird_setting')
            ProfileFactory.create(user=self.user1, verified_micromaster_user=True)
        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.status_code == HTTP_404_NOT_FOUND

    def test_instructor_sees_entire_profile(self):
        """
        An instructor should be able to see the entire profile despite the account privacy
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)

        program = ProgramFactory.create()
        ProgramEnrollment.objects.create(
            program=program,
            user=profile.user,
        )
        Role.objects.create(
            program=program,
            role=Instructor.ROLE_ID,
            user=self.user1,
        )

        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == format_image_expectation(
            ProfileSerializer().to_representation(profile)
        )

    def test_staff_sees_entire_profile(self):
        """
        Staff should be able to see the entire profile despite the account privacy
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user2, account_privacy=Profile.PRIVATE)
            ProfileFactory.create(user=self.user1, verified_micromaster_user=False)

        program = ProgramFactory.create()
        ProgramEnrollment.objects.create(
            program=program,
            user=profile.user,
        )
        Role.objects.create(
            program=program,
            role=Staff.ROLE_ID,
            user=self.user1,
        )

        self.client.force_login(self.user1)
        resp = self.client.get(self.url2)
        assert resp.json() == format_image_expectation(
            ProfileSerializer().to_representation(profile)
        )


class ProfilePATCHTests(ProfileBaseTests):
    """
    Tests for profile PATCH
    """
    def test_patch_own_profile(self):
        """
        A user PATCHes their own profile
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user1, filled_out=False, agreed_to_terms_of_service=False)
        self.client.force_login(self.user1)

        with mute_signals(post_save):
            new_profile = ProfileFactory.create(filled_out=False)
        new_profile.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(new_profile.user.username)
        )
        patch_data = ProfileSerializer().to_representation(new_profile)
        del patch_data['image']

        resp = self.client.patch(self.url1, content_type="application/json", data=json.dumps(patch_data))
        assert resp.status_code == 200

        old_profile = Profile.objects.get(user__username=self.user1.username)
        for key, value in patch_data.items():
            field = ProfileSerializer().fields[key]

            if isinstance(field, (ListSerializer, SerializerMethodField, ReadOnlyField)) or field.read_only is True:
                # these fields are readonly
                continue
            elif isinstance(field, DateField):
                assert getattr(old_profile, key) == parse(value).date()
            else:
                assert getattr(old_profile, key) == value

    def test_serializer(self):
        """
        Get a user's own profile, ensure that we used ProfileSerializer and not ProfileFilledOutSerializer
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user1, filled_out=False)
        self.client.force_login(self.user1)

        patch_data = ProfileSerializer().to_representation(profile)
        # PATCH may not succeed, we just care that the right serializer was used
        with patch(
            'profiles.views.ProfileFilledOutSerializer.__new__',
            autospec=True,
            side_effect=ProfileFilledOutSerializer.__new__
        ) as mocked_filled_out, patch(
            'profiles.views.ProfileSerializer.__new__',
            autospec=True,
            side_effect=ProfileSerializer.__new__
        ) as mocked:
            self.client.patch(self.url1, content_type="application/json", data=json.dumps(patch_data))
        assert mocked.called
        assert not mocked_filled_out.called

    def test_filled_out_serializer(self):
        """
        Get a user's own profile, ensure that we used ProfileFilledOutSerializer
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(user=self.user1, filled_out=True)
        self.client.force_login(self.user1)

        patch_data = ProfileSerializer().to_representation(profile)
        # PATCH may not succeed, we just care that the right serializer was used
        with patch(
            'profiles.views.ProfileFilledOutSerializer.__new__',
            autospec=True,
            side_effect=ProfileFilledOutSerializer.__new__
        ) as mocked:
            self.client.patch(self.url1, content_type="application/json", data=json.dumps(patch_data))
        assert mocked.called

    def test_forbidden_methods(self):
        """
        POST is not implemented.
        """
        with mute_signals(post_save):
            ProfileFactory.create(user=self.user1)
        self.client.force_login(self.user1)
        assert self.client.post(self.url1).status_code == HTTP_405_METHOD_NOT_ALLOWED
