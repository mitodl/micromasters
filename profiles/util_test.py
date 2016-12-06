"""
Tests for util functions
"""

from unittest import TestCase

from profiles import util


# pylint: disable=no-self-use
class UtilTests(TestCase):
    """
    Tests for util functions
    """

    def test_split_name_none(self):
        """
        None should be treated like an empty string
        """
        first_name, last_name = util.split_name(None)
        assert first_name == ""
        assert last_name == ""

    def test_split_name_empty(self):
        """
        split_name should always return two parts
        """
        first_name, last_name = util.split_name("")
        assert first_name == ""
        assert last_name == ""

    def test_split_name_one(self):
        """
        Split name should have the name as the first tuple item
        """
        first_name, last_name = util.split_name("one")
        assert first_name == "one"
        assert last_name == ""

    def test_split_name_two(self):
        """
        Split name with two names
        """
        first_name, last_name = util.split_name("two names")
        assert first_name == "two"
        assert last_name == "names"

    def test_split_name_more_than_two(self):
        """
        Split name should be limited to two names
        """
        first_name, last_name = util.split_name("three names here")
        assert first_name == "three"
        assert last_name == "names here"

    def test_format_gravatar(self):
        """
        Format URL for gravatar
        """
        user_email = "foo.bar@example.com"
        user_email_spaces = "      foo.bar@example.com       "
        expected_url = ('https://www.gravatar.com/avatar/a7440323a684ea47406313a33156e5e9?'
                        'r=PG&s={size}&d=https%3A%2F%2Fs3.amazonaws.com'
                        '%2Fodl-micromasters-production%2Favatar_default.png')
        for size in (util.GravatarImgSize.FULL, util.GravatarImgSize.LARGE,
                     util.GravatarImgSize.MEDIUM, util.GravatarImgSize.SMALL):
            assert expected_url.format(size=size) == util.format_gravatar_url(user_email, size)
            assert expected_url.format(size=size) == util.format_gravatar_url(user_email_spaces, size)

    def test_profile_image_upload_uri(self):
        """
        Test for long profile image upload uris
        """

        too_long_url = '{}.jpg'.format('a' * 150)
        assert len(util.profile_image_upload_uri(None, too_long_url)) == 100
