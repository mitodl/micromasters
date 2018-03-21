"""
Tests for util functions
"""
from io import BytesIO
from unittest import TestCase
from unittest.mock import patch
import ddt

from django.db.models.signals import post_save
from django.test import TestCase as DjangoTestCase
from factory.django import mute_signals

from factory.fuzzy import FuzzyInteger
from PIL import Image

from profiles import util
from profiles.factories import ProfileFactory, SocialProfileFactory


class SplitNameTests(TestCase):
    """
    Tests for split_name
    """
    def test_none(self):
        """
        None should be treated like an empty string
        """
        first_name, last_name = util.split_name(None)
        assert first_name == ""
        assert last_name == ""

    def test_empty(self):
        """
        split_name should always return two parts
        """
        first_name, last_name = util.split_name("")
        assert first_name == ""
        assert last_name == ""

    def test_one(self):
        """
        Split name should have the name as the first tuple item
        """
        first_name, last_name = util.split_name("one")
        assert first_name == "one"
        assert last_name == ""

    def test_two(self):
        """
        Split name with two names
        """
        first_name, last_name = util.split_name("two names")
        assert first_name == "two"
        assert last_name == "names"

    def test_more_than_two(self):
        """
        Split name should be limited to two names
        """
        first_name, last_name = util.split_name("three names here")
        assert first_name == "three"
        assert last_name == "names here"


class ImageTests(TestCase):
    """Tests for profile image util functions"""
    def test_upload_url(self):
        """
        profile_image_upload_uri should make an upload path with a timestamp
        """
        name = 'name'
        ext = '.jpg'
        filename = '{name}{ext}'.format(name=name, ext=ext)
        url = util.profile_image_upload_uri(None, filename)
        assert url.startswith('profile/{name}-'.format(name=name))
        assert url.endswith('{ext}'.format(ext=ext))

    def test_small(self):
        """
        profile_image_upload_uri_small should make an upload path with a timestamp
        """
        name = 'name'
        ext = '.jpg'
        filename = '{name}{ext}'.format(name=name, ext=ext)
        url = util.profile_image_upload_uri_small(None, filename)
        assert url.startswith('profile/{name}-'.format(name=name))
        assert url.endswith('_small{ext}'.format(ext=ext))

    def test_too_long_name(self):
        """
        A name which is too long should get truncated to 100 characters
        """
        filename = '{}.jpg'.format('a' * 150)
        full_path = util.profile_image_upload_uri(None, filename)
        assert len(full_path) == 100
        assert full_path.startswith("profile/")
        assert full_path.endswith(".jpg")

    def test_too_long_prefix(self):
        """
        A name which is too long should get truncated to 100 characters
        """
        filename = '{}.jpg'.format('a' * 150)
        with self.assertRaises(ValueError) as ex:
            util._generate_upload_to_uri("x"*150)(None, filename)  # pylint: disable=protected-access
        assert ex.exception.args[0].startswith("path is longer than max length even without name")

    def test_shrink_dimensions(self):
        """Tests for make_small_dimensions"""
        # If dimensions are too small no resizing should be done
        assert util.shrink_dimensions(20, 63, 64) == (20, 63)
        # Both dimensions should shrink, maintaining same aspect ratio, until width or height is 64
        # dimensions will be rounded down into ints
        assert util.shrink_dimensions(20, 100, 64) == (12, 64)
        assert util.shrink_dimensions(100, 20, 64) == (64, 12)

        # A bigger value should also work
        assert util.shrink_dimensions(100, 20, 90) == (90, 18)

    def test_make_thumbnail(self):
        """
        Test that image output by make_thumbnail uses dimensions provided by make_small_dimensions
        """

        thumbnail_size = 64
        thumb_width = FuzzyInteger(1, 1024).fuzz()
        thumb_height = FuzzyInteger(1, 1024).fuzz()
        # To do the asserts correctly thumbnail dimensions have to have the same aspect ratio
        width = thumb_width * 4
        height = thumb_height * 4

        image = Image.new('RGBA', (width, height))
        full_image_file = BytesIO()
        image.save(full_image_file, "PNG")
        full_image_file.seek(0)

        with patch(
            'profiles.util.shrink_dimensions',
            return_value=(thumb_width, thumb_height, thumbnail_size)
        ) as mocked:
            thumb_file = util.make_thumbnail(full_image_file, 64)
            thumb_image = Image.open(thumb_file)
            mocked.assert_called_with(width, height, thumbnail_size)
            assert thumb_image.width == thumb_width
            assert thumb_image.height == thumb_height


class FullNameTests(DjangoTestCase):
    """
    Tests for profile full name function.
    """
    def test_full_name_no_profile(self):
        """
        test full name of user when no profile.
        """
        self.assertIsNone(util.full_name(None))

    def test_full_name(self):
        """
        test full name of user on given profile.
        """
        first = "Tester"
        last = "KK"
        profile = SocialProfileFactory.create(first_name=first, last_name=last)
        assert util.full_name(profile.user) == "{} {}".format(first, last)

    def test_full_name_when_last_name_empty(self):
        """
        Test full name when last name is set empty on profile.
        """
        first = "Tester"
        last = ""
        profile = SocialProfileFactory.create(first_name=first, last_name=last)
        assert util.full_name(profile.user) == "{name} ".format(name=first)

    def test_full_name_when_first_name_empty(self):
        """
        Test full name when first name is set empty on profile.
        """
        first = ""
        last = "Tester"
        profile = SocialProfileFactory.create(first_name=first, last_name=last)
        assert util.full_name(profile.user) == "{} {}".format(profile.user.username, last)


@ddt.ddt
class IsProfileFilledOutTests(DjangoTestCase):
    """
    Tests for is_profile_filled_out function.
    """
    def setUp(self):
        super(IsProfileFilledOutTests, self).setUp()
        with mute_signals(post_save):
            self.profile = ProfileFactory.create()

    @ddt.data(*util.COMPULSORY_FIELDS)
    def test_is_profile_filled_out_when_none(self, column):
        """tests is_profile_filled_out method when column is None"""
        setattr(self.profile, column, None)
        self.profile.save()
        assert util.is_profile_filled_out(self.profile) is False

    # dob cannot be blank since it is a Date
    @ddt.data(
        *[field for field in util.COMPULSORY_FIELDS if field != 'date_of_birth']
    )
    def test_is_profile_filled_out_when_blank(self, column):
        """tests is_profile_filled_out method when column is blank"""
        setattr(self.profile, column, "")
        self.profile.save()
        assert util.is_profile_filled_out(self.profile) is False

    def test_is_profile_filled_out(self):
        """tests is_profile_filled_out method when column is filled out"""
        assert util.is_profile_filled_out(self.profile) is True
