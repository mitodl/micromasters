"""
Model tests
"""
from datetime import datetime
from unittest.mock import patch
from ddt import ddt, data

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
from search.base import MockedESTestCase


class StudentIdTests(MockedESTestCase):
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


class ImageTests(MockedESTestCase):
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


class ProfileAddressTests(MockedESTestCase):
    """
    Tests for splitting a user's address field
    """

    def test_unset_address(self):
        """Test splitting an unset address"""
        with mute_signals(post_save):
            profile = ProfileFactory(address=None)
        assert profile.address1 is None
        assert profile.address2 is None
        assert profile.address3 is None

    def test_empty_address(self):
        """Test splitting an empty address"""
        with mute_signals(post_save):
            profile = ProfileFactory(address="")
        assert profile.address1 == ""
        assert profile.address2 == ""
        assert profile.address3 == ""

    def test_short_address(self):
        """Test splitting a short address"""
        with mute_signals(post_save):
            profile = ProfileFactory(address="123 Main Street")
        assert profile.address1 == "123 Main Street"
        assert profile.address2 == ""
        assert profile.address3 == ""

    def test_long_address(self):
        """Test splitting a long address"""
        address = (
            "Who lives in a pineapple under the sea? "
            "SPONGEBOB SQUAREPANTS! "
            "Absorbent and yellow and porous is he"
        )
        with mute_signals(post_save):
            profile = ProfileFactory(address=address)
        assert profile.address1 == "Who lives in a pineapple under the sea?"
        assert profile.address2 == "SPONGEBOB SQUAREPANTS! Absorbent and"
        assert profile.address3 == "yellow and porous is he"


@ddt
class ProfileDisplayNameTests(MockedESTestCase):
    """
    Tests for profile display name
    """
    def test_full_display_name(self):
        """Test the profile display name with all name components set"""
        with mute_signals(post_save):
            profile = ProfileFactory(first_name='First', last_name='Last', preferred_name='Pref')
        assert profile.display_name == 'First Last (Pref)'

    @data(None, 'First')
    def test_display_name_without_preferred(self, pref_name):
        """Test the profile display name with a preferred name that is blank or equal to first name"""
        with mute_signals(post_save):
            profile = ProfileFactory(first_name='First', last_name='Last', preferred_name=pref_name)
        assert profile.display_name == 'First Last'

    def test_display_name_no_last_name(self):
        """Test the profile display name with a blank last name"""
        with mute_signals(post_save):
            profile = ProfileFactory(first_name='First', last_name=None, preferred_name=None)
        assert profile.display_name == 'First'

    def test_display_name_no_first_name(self):
        """Test the profile display name with a blank first name"""
        with mute_signals(post_save):
            profile = ProfileFactory(user__username='uname', first_name=None, last_name=None, preferred_name=None)
        assert profile.display_name == 'uname'
