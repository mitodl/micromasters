"""
Test cases for course utils
"""
from datetime import datetime

from ddt import (
    ddt,
    data,
    unpack
)
from django.test import TestCase
import pytz

from courses.utils import (
    get_year_season_from_course_run,
    is_blank
)
from courses.factories import CourseRunFactory


@ddt
class CourseUtilTests(TestCase):
    """
    Test cases for course utils
    """

    def test_get_year_season_from_course_run(self):
        """
        Tests that year/season is calculated appropriately from a CourseRun
        """
        fall_2016_dt = datetime(2016, 10, 1, tzinfo=pytz.UTC)
        test_run1 = CourseRunFactory.build(edx_course_key='course-v1:MITx+CTL.SC0x+1T2016', start_date=fall_2016_dt)
        test_run2 = CourseRunFactory.build(edx_course_key='MITx/14.73x_1/1T2016', start_date=fall_2016_dt)
        test_run3 = CourseRunFactory.build(edx_course_key='MITx/14.73x_1', start_date=fall_2016_dt)
        test_run4 = CourseRunFactory.build(edx_course_key='invalid', start_date=fall_2016_dt)
        unparseable_test_run1 = CourseRunFactory.build(edx_course_key='invalid', start_date=None)
        unparseable_test_run2 = CourseRunFactory.build(
            edx_course_key='course-v1:MITX+MITx_Digital_learning_300+3Tabc',
            start_date=None
        )
        assert get_year_season_from_course_run(test_run1) == (2016, 'Spring')
        assert get_year_season_from_course_run(test_run2) == (2016, 'Spring')
        assert get_year_season_from_course_run(test_run3) == (2016, 'Fall')
        assert get_year_season_from_course_run(test_run4) == (2016, 'Fall')
        assert get_year_season_from_course_run(unparseable_test_run1) == ()
        assert get_year_season_from_course_run(unparseable_test_run2) == ()

    @data(
        (None, True),
        ("", True),
        ("Foo", False),
    )
    @unpack
    def test_is_blank(self, text, expected):
        """Test is_blank"""
        assert is_blank(text) is expected
