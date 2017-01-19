"""Tests for utils file"""
import datetime
from unittest import TestCase
import pytz

from seed_data.utils import add_year


class AddYearTests(TestCase):
    """Tests for add year method"""

    def test_add_year(self):  # pylint: disable=no-self-use
        """assert add year method works"""
        now = datetime.datetime.now(tz=pytz.UTC)
        date = add_year(now, years=1)
        assert now.year + 1 == date.year
        assert now.month == date.month
        assert now.day == date.day

    def test_add_year_to_leap_year(self):  # pylint: disable=no-self-use
        """assert add year method works on leap year"""
        # assert next year day, month for leap year.
        leap_year = datetime.datetime(2016, 3, 1, 0, 0, 0)
        date = add_year(leap_year, years=1)
        assert leap_year.year + 1 == date.year
        assert leap_year.month == date.month
        assert leap_year.day == date.day

    def test_add_year_when_next_year_leap(self):  # pylint: disable=no-self-use
        """assert add year method works when next year is leap year"""
        leap_year = datetime.datetime(2015, 3, 1, 0, 0, 0)
        date = add_year(leap_year, years=1)
        assert leap_year.year + 1 == date.year
        assert leap_year.month == date.month
        assert leap_year.day == date.day
