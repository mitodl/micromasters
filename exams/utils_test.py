"""
Tests for exam util
"""

from django.test import TestCase

from exams.utils import strip_non_cp_1252_chars


class ExamUtilsTest(TestCase):
    """
    Tests for exams/utils.py
    """
    def test_strip_non_cp_1252_chars(self):  # pylint: disable=no-self-use
        """
        Tests that strip_non_cp_1252_chars returns a string with only the chars inside CP-1252
        """

        result = strip_non_cp_1252_chars(u"abcd124\u046D")

        assert result == "abcd124"
