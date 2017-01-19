"""Tests for utils file"""
import datetime
from unittest import TestCase

from seed_data.utils import add_year


class AddYearTests(TestCase):
    """Tests for add year method"""

    def test_add_year(self):  # pylint: disable=no-self-use
        """assert add year method works"""
        # assert next year day, month for leap year.
        leap_year = datetime.datetime(2016, 2, 29, 0, 0, 0)
        next_year_date = add_year(leap_year, years=1)
        assert leap_year.year + 1 == next_year_date.year
        assert leap_year.month + 1 == next_year_date.month
        assert leap_year.day == 29
        assert next_year_date.day == 1

    def test_add_year_to_leap_year(self):  # pylint: disable=no-self-use
        """assert add year method works on leap year"""
        # assert next year day, month for leap year.
        leap_year = datetime.datetime(2016, 2, 28, 0, 0, 0)
        next_year_date = add_year(leap_year, years=1)
        assert leap_year.year + 1 == next_year_date.year
        assert leap_year.month == next_year_date.month
        assert leap_year.day == next_year_date.day

    def test_add_year_when_next_year_leap(self):  # pylint: disable=no-self-use
        """assert add year method works when next year is leap year"""
        leap_year = datetime.datetime(2015, 2, 28, 0, 0, 0)
        next_year_date = add_year(leap_year, years=1)
        assert leap_year.year + 1 == next_year_date.year
        assert leap_year.month == next_year_date.month
        assert leap_year.day == next_year_date.day
