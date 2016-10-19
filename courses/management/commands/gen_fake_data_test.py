"""
gen_fake_data test
"""

import mock

from courses.management.commands.gen_fake_data import Command
from courses.models import (
    Course,
    CourseRun,
    Program,
)
from ecommerce.models import CoursePrice
from search.base import ESTestCase


class GenFakeDataTest(ESTestCase):
    """
    gen_fake_data tests
    """

    def test_gen_fake_data(self):  # pylint: disable=no-self-use
        """
        gen_fake_data should generate some data
        """
        with mock.patch('courses.management.commands.gen_fake_data.randint', autospec=True) as randint:
            randint.side_effect = lambda _min, _max: _max

            command = Command()
            programs_count = 2
            courses_count = 3
            course_runs_count = 4
            command.handle(
                programs=programs_count,
                courses=courses_count,
                course_runs=course_runs_count,
                course_prices=True,
            )

            total_course_runs = programs_count * courses_count * course_runs_count
            assert CoursePrice.objects.count() == total_course_runs
            assert CourseRun.objects.count() == total_course_runs
            assert Course.objects.count() == programs_count * courses_count
            assert Program.objects.count() == programs_count
