"""Tests for attach_avatars"""
from django.db.models.signals import post_save
from factory.django import mute_signals

from profiles.factories import ProfileFactory
from profiles.models import Profile
from search.base import MockedESTestCase
from seed_data.management.commands.attach_avatars import Command


class AttachAvatarsTest(MockedESTestCase):
    """
    Tests for attach_avatars
    """
    def setUp(self):
        super().setUp()
        self.command = Command()

    def test_attach_avatars(self):
        """
        It should attach robotic avatars given a username prefix
        """
        with mute_signals(post_save):
            for i in range(3):
                ProfileFactory.create(user__username="user_{}".format(i))
            for i in range(3):
                ProfileFactory.create(user__username="fake_{}".format(i))

        # clear all images
        for profile in Profile.objects.all():
            profile.image = None
            profile.image_medium = None
            profile.image_small = None
            profile.save()

        self.command.handle("attach_avatars", username_prefix="fake")
        for profile in Profile.objects.all():
            has_image = profile.user.username.startswith("fake")
            assert bool(profile.image) == has_image
            assert bool(profile.image_medium) == has_image
            assert bool(profile.image_small) == has_image
