"""
Model tests
"""
# pylint: disable=no-self-use
from datetime import datetime
from unittest.mock import patch

from django.db.models.signals import post_save
from factory.django import mute_signals
import pytz

from profiles.factories import ProfileFactory, UserFactory
from profiles.models import Profile
from profiles.util import (
    profile_image_upload_uri,
    profile_image_upload_uri_small,
    profile_image_upload_uri_medium,
)
from search.base import ESTestCase


class StudentIdTests(ESTestCase):
    """tests that student_id is updated properly"""

    def test_on_save(self):
        """test that a student id is set on save"""
        with mute_signals(post_save):
            profile = ProfileFactory()
        assert profile.student_id is not None
        assert profile.student_id == profile.id

    def test_increments(self):
        """test that a student id increments correctly"""
        with mute_signals(post_save):
            profile_one = ProfileFactory()
            profile_two = ProfileFactory()
        assert profile_two.student_id > profile_one.student_id

    def test_doesnt_change_on_save(self):
        """test that a saved id isn't overwritten"""
        with mute_signals(post_save):
            profile = ProfileFactory()
        assert profile.student_id is not None
        current_id = profile.student_id
        with mute_signals(post_save):
            profile.save()
        profile.refresh_from_db()
        assert profile.student_id == current_id

    def test_should_pretty_print(self):
        """test pretty printing property method"""
        with mute_signals(post_save):
            profile = ProfileFactory()
        assert profile.pretty_printed_student_id == "MMM{0:06}".format(profile.student_id)

    def test_should_be_blank_if_not_yet_saved(self):
        """test student id when model instance not yet saved"""
        with mute_signals(post_save):
            user = UserFactory()
        profile = Profile(user=user)
        assert profile.student_id is None
        assert profile.pretty_printed_student_id is ''


class ImageTests(ESTestCase):
    """
    Tests for image fields
    """
    def test_upload_to(self):
        """
        Image upload_to should have a function which creates a path
        """
        # pin the timestamps used in creating the URL
        with patch('profiles.util.datetime', autospec=True) as mocked_datetime:
            mocked_datetime.now.return_value = datetime.now(tz=pytz.UTC)
            with mute_signals(post_save):
                profile = ProfileFactory.create()

            assert profile.image.url.endswith(profile_image_upload_uri(None, "example.jpg").replace("+", ""))
            assert profile.image_small.url.endswith(
                profile_image_upload_uri_small(None, "example.jpg").replace("+", "")
            )
            assert profile.image_medium.url.endswith(
                profile_image_upload_uri_medium(None, "example.jpg").replace("+", "")
            )
