"""
Model tests
"""
from unittest.mock import patch
from io import BytesIO

from ddt import ddt, data, unpack
from django.core.files.uploadedfile import UploadedFile
from django.db.models.signals import post_save
from factory.django import mute_signals
from PIL import Image

from micromasters.utils import now_in_utc
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
        assert profile.pretty_printed_student_id == ''


class ImageTests(MockedESTestCase):
    """
    Tests for image fields
    """
    def test_upload_to(self):
        """
        Image upload_to should have a function which creates a path
        """
        # pin the timestamps used in creating the URL
        with patch('profiles.util.now_in_utc', autospec=True) as mocked_now_in_utc:
            mocked_now_in_utc.return_value = now_in_utc()
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
class ProfileCountrySubdivisionTests(MockedESTestCase):
    """
    Tests for country_subdivision property
    """

    @data(
        (None, (None, None)),
        ('MA', (None, None)),
        ('US-MA', ('US', 'MA')),
        ('US-MA-BS', (None, None)),  # non a valid code
    )
    @unpack
    def test_country_subdivision(self, state, expected_result):
        """Test country_subdivision against a range of values"""
        with mute_signals(post_save):
            profile = ProfileFactory(state_or_territory=state)

        assert profile.country_subdivision == expected_result


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

    @data(
        ('First', 'Last', 'uname', 'First Last'),
        (None, 'Last', 'uname', 'uname Last'),
        ('First', None, 'uname', 'First ')
    )
    @unpack
    def test_full_name(self, first_name, last_name, username, expected_full_name):
        """Test the profile full name"""
        with mute_signals(post_save):
            profile = ProfileFactory(
                first_name=first_name,
                last_name=last_name,
                user__username=username
            )
        assert profile.full_name == expected_full_name


class ProfileImageTests(MockedESTestCase):
    """Tests for the profile image and thumbnails"""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        with mute_signals(post_save):
            cls.profile = ProfileFactory.create(
                filled_out=True,
                agreed_to_terms_of_service=True,
            )

    def setUp(self):
        super().setUp()

        # create a dummy image file in memory for upload
        image_file = BytesIO()
        image = Image.new('RGBA', size=(50, 50), color=(256, 0, 0))
        image.save(image_file, 'png')
        image_file.seek(0)

        self.profile.image = UploadedFile(image_file, "filename.png", "image/png", len(image_file.getvalue()))
        self.profile.save(update_image=True)

    def test_resized_images_created(self):
        """
        thumbnails images should be created if update_image is True
        """
        self.profile.image_small = None
        self.profile.image_medium = None
        self.profile.save()
        assert self.profile.image
        assert not self.profile.image_small
        assert not self.profile.image_medium

        self.profile.save(update_image=True)
        assert self.profile.image_small
        assert self.profile.image_medium

    def test_resized_images_updated(self):
        """
        thumbnails should be updated if image is already present and updated when update_image=True
        """
        assert self.profile.image
        assert self.profile.image_small
        assert self.profile.image_medium

        # create a dummy image file in memory for upload
        image_file = BytesIO()
        image = Image.new('RGBA', size=(50, 50), color=(256, 0, 0))
        image.save(image_file, 'png')
        image_file.seek(0)

        self.profile.image = UploadedFile(image_file, "filename.png", "image/png", len(image_file.getvalue()))
        self.profile.save(update_image=True)
        image_file_bytes = image_file.read()
        assert self.profile.image_small.file.read() != image_file_bytes
        assert self.profile.image_medium.file.read() != image_file_bytes

    def test_resized_images_not_changed(self):
        """
        resized images should not be updated if update_image is False
        """
        old_image_small = self.profile.image_small
        old_image_medium = self.profile.image_medium
        self.profile.save()
        assert self.profile.image_small == old_image_small
        assert self.profile.image_medium == old_image_medium

    def test_null_image(self):
        """
        If the main image is null the thumbnails should be too
        """
        assert self.profile.image
        assert self.profile.image_medium
        assert self.profile.image_small

        self.profile.image = None
        self.profile.save(update_image=True)
        assert not self.profile.image
        assert not self.profile.image_medium
        assert not self.profile.image_small
