"""Tests for utils file"""
import datetime
from unittest import TestCase
from ddt import ddt, data, unpack

from seed_data.utils import add_year


@ddt
class AddYearTests(TestCase):
    """Tests for add year method"""

    @data(
        # year, month, day, expected_year, expected_month, expected_day
        [2016, 2, 29, 2017, 3, 1],
        [2016, 2, 28, 2017, 2, 28],
        [2015, 2, 28, 2016, 2, 28]
    )
    @unpack
    def test_add_year(self, year, month, day, expected_year, expected_month, expected_day):
        """assert add year method works"""
        # pylint: disable=too-many-arguments
        leap_year = datetime.datetime(year, month, day, 0, 0, 0)
        next_year_date = add_year(leap_year, years=1)
        assert next_year_date.year == expected_year
        assert next_year_date.month == expected_month
        assert next_year_date.day == expected_day
