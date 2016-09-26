"""
Model tests
"""
# pylint: disable=no-self-use
from datetime import datetime, timedelta

import pytz

from courses.factories import (
    ProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from courses.models import CourseRun
from search.base import ESTestCase


class ProgramTests(ESTestCase):
    """Tests for Program model"""

    def test_to_string(self):
        """Test for __str__ method"""
        prog = ProgramFactory.build(title="Title")
        assert "{}".format(prog) == "Title"


class CourseModelTests(ESTestCase):
    """Mixin for Course models"""

    @classmethod
    def setUpTestData(cls):
        super(CourseModelTests, cls).setUpTestData()
        cls.course = CourseFactory.create(title="Title")

    def setUp(self):
        super(CourseModelTests, self).setUp()
        self.now = datetime.now(pytz.utc)

    def create_run(self, course=None, start=None, end=None,
                   enr_start=None, enr_end=None, upgrade_deadline=None):
        """helper function to create course runs"""
        # pylint: disable=too-many-arguments
        return CourseRunFactory.create(
            course=course or self.course,
            title="Title Run",
            start_date=start,
            end_date=end,
            enrollment_start=enr_start,
            enrollment_end=enr_end,
            upgrade_deadline=upgrade_deadline,
        )


class CourseTests(CourseModelTests):
    """Tests for Course model"""

    def test_to_string(self):
        """Test for __str__ method"""
        assert "{}".format(self.course) == "Title"

    def test_get_next_run_no_run(self):
        """
        Test for the get_next_run method
        No run available
        """
        assert self.course.get_next_run() is None

    def test_get_next_run_only_past(self):
        """
        Test for the get_next_run method
        enrollment past and course past
        """
        self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
        )
        assert self.course.get_next_run() is None

    def test_get_next_run_present_enroll_closed(self):
        """
        Test for the get_next_run method
        enrollment past, course present
        """
        self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now-timedelta(weeks=3),
        )
        assert self.course.get_next_run() is None

    def test_get_next_run_present_enroll_closed_course_future(self):
        """
        Test for the get_next_run method
        enrollment past, course future
        """
        self.create_run(
            start=self.now+timedelta(weeks=1),
            end=self.now+timedelta(weeks=3),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now-timedelta(weeks=3),
        )
        assert self.course.get_next_run() is None

    def test_get_next_run_enroll_none_course_past(self):
        """
        Test for the get_next_run method
        enrollment none, course past
        """
        self.create_run(
            start=self.now-timedelta(weeks=10),
            end=self.now-timedelta(weeks=3),
        )
        assert self.course.get_next_run() is None

    def test_get_next_run_only_present_forever(self):
        """
        Test for the get_next_run method
        enrollment none, course started in the past with no end
        """
        course_run = self.create_run(
            start=self.now-timedelta(weeks=52),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_get_next_run_enr_present_course_future(self):
        """
        Test for the get_next_run method
        enrollment present, course future
        """
        course_run = self.create_run(
            start=self.now+timedelta(weeks=1),
            end=self.now+timedelta(weeks=4),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_get_next_run_present_enroll_open(self):
        """
        Test for the get_next_run method
        enrollment present, course present
        """
        course_run = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_get_next_run_present_enroll_open_null(self):
        """
        Test for the get_next_run method
        enrollment past with no end, course present
        """
        course_run = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_get_next_run_present_enroll_open_with_future_present(self):
        """
        Test for the get_next_run method
        one run with enrollment present and course present
        and one run with enrollment future and course future
        """
        course_run = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
        )
        self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_get_next_run_present_enroll_closed_with_future_present(self):
        """
        Test for the get_next_run method
        one run with enrollment past and course present
        and one run with enrollment future and course future
        """
        self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now-timedelta(weeks=1),
        )
        course_run = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_get_next_run_future(self):
        """
        Test for the get_next_run method
        enrollment in the future and course in the future
        """
        course_run = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_get_next_run_enroll_none_course_future(self):
        """
        Test for the get_next_run method
        enrollment none, course future
        """
        course_run = self.create_run(
            start=self.now+timedelta(weeks=1),
            end=self.now+timedelta(weeks=4),
        )
        next_run = self.course.get_next_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk


class CourseRunTests(CourseModelTests):
    """Tests for Course Run model"""

    def test_to_string(self):
        """Test for __str__ method"""
        course_run = self.create_run()
        assert "{}".format(course_run) == "Title Run"

    def test_is_current_no_start(self):
        """Test for is_current property"""
        course_run = self.create_run()
        assert course_run.is_current is False

        # even if the end is in the future
        course_run = self.create_run(
            end=self.now+timedelta(weeks=1)
        )
        assert course_run.is_current is False

    def test_is_current_no_end(self):
        """Test for is_current property"""
        # with the start in the past
        course_run = self.create_run(
            start=self.now-timedelta(weeks=1)
        )
        assert course_run.is_current is True

        # with the start in the future
        course_run = self.create_run(
            start=self.now+timedelta(weeks=1)
        )
        assert course_run.is_current is False

    def test_is_current(self):
        """Test for is_current property"""
        # with the start and end in the past
        course_run = self.create_run(
            start=self.now-timedelta(weeks=2),
            end=self.now-timedelta(weeks=1)
        )
        assert course_run.is_current is False

        # with the start in the past and end in the future
        course_run = self.create_run(
            start=self.now-timedelta(weeks=2),
            end=self.now+timedelta(weeks=1)
        )
        assert course_run.is_current is True

        # with the start and end in the future
        course_run = self.create_run(
            start=self.now+timedelta(weeks=1),
            end=self.now+timedelta(weeks=2)
        )
        assert course_run.is_current is False

        # with the start in the future and end in the past
        course_run = self.create_run(
            start=self.now+timedelta(weeks=1),
            end=self.now-timedelta(weeks=2)
        )
        assert course_run.is_current is False

    def test_is_past(self):
        """Test for is_past property"""
        # with no end
        course_run = self.create_run()
        assert course_run.is_past is False

        # with end in the future
        course_run = self.create_run(
            end=self.now+timedelta(weeks=2)
        )
        assert course_run.is_past is False

        # with end in the past
        course_run = self.create_run(
            end=self.now-timedelta(weeks=2)
        )
        assert course_run.is_past is True

    def test_is_future(self):
        """Test for is_future property"""
        # with no start
        course_run = self.create_run()
        assert course_run.is_future is False

        # with start in the future
        course_run = self.create_run(
            start=self.now+timedelta(weeks=2)
        )
        assert course_run.is_future is True

        # with start in the past
        course_run = self.create_run(
            start=self.now-timedelta(weeks=2)
        )
        assert course_run.is_future is False

    def test_is_future_enrollment_open(self):
        """Test for is_future_enrollment_open property"""
        # with no start date
        course_run = self.create_run()
        assert course_run.is_future_enrollment_open is False

        # with start in the future, no enrollment_start
        course_run = self.create_run(
            start=self.now + timedelta(weeks=2)
        )
        assert course_run.is_future_enrollment_open is False

        # enrollment_start in the past, no enrollment_end
        course_run = self.create_run(
            start=self.now + timedelta(weeks=2),
            enr_start=self.now - timedelta(weeks=3),
            enr_end=None
        )
        assert course_run.is_future_enrollment_open is True

        # enrollment_start in the past, enrollment_end in the past
        course_run = self.create_run(
            start=self.now + timedelta(weeks=2),
            enr_start=self.now - timedelta(weeks=3),
            enr_end=self.now - timedelta(weeks=1)
        )
        assert course_run.is_future_enrollment_open is False

        # enrollment_start in the past, enrollment_end in the future
        course_run = self.create_run(
            start=self.now + timedelta(weeks=2),
            enr_start=self.now - timedelta(weeks=3),
            enr_end=self.now + timedelta(weeks=3)
        )
        assert course_run.is_future_enrollment_open is True

        # enrollment_start in the future
        course_run = self.create_run(
            start=self.now + timedelta(weeks=2),
            enr_start=self.now + timedelta(weeks=1)
        )
        assert course_run.is_future_enrollment_open is False

    def test_is_upgradable(self):
        """Test for is_upgradable property"""
        # with no upgrade_deadline
        course_run = self.create_run()
        assert course_run.is_upgradable is True

        # with upgrade_deadline in the future
        course_run = self.create_run(
            upgrade_deadline=self.now+timedelta(weeks=2)
        )
        assert course_run.is_upgradable is True

        # with upgrade_deadline in the past
        course_run = self.create_run(
            upgrade_deadline=self.now-timedelta(weeks=2)
        )
        assert course_run.is_upgradable is False
