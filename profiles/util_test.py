"""
Tests for util functions
"""
from datetime import datetime
from io import BytesIO
from unittest import TestCase
from unittest.mock import patch

from factory.fuzzy import FuzzyInteger
from PIL import Image
import pytz

from profiles import util


# pylint: disable=no-self-use
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
        filename = 'name.jpg'
        timestamp = datetime.now(pytz.utc).replace(microsecond=0)
        url = util.profile_image_upload_uri(None, filename)
        assert url == 'profile/{name}-{timestamp}{ext}'.format(
            name='name',
            timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S-%z"),
            ext='.jpg',
        )

    def test_small(self):
        """
        profile_image_upload_uri_small should make an upload path with a timestamp
        """
        filename = 'name.jpg'
        timestamp = datetime.now(pytz.utc).replace(microsecond=0)
        url = util.profile_image_upload_uri_small(None, filename)
        assert url == 'profile/{name}-{timestamp}_small{ext}'.format(
            name='name',
            timestamp=timestamp.strftime("%Y-%m-%dT%H%M%S-%z"),
            ext='.jpg',
        )

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
