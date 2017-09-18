"""
Model tests
"""
from datetime import timedelta
from urllib.parse import urljoin

from ddt import ddt, data, unpack
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings

from courses.factories import (
    ProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from courses.models import CourseRun
from exams.factories import ExamRunFactory
from grades.models import CourseRunGradingStatus
from grades.constants import FinalGradeStatus
from micromasters.utils import now_in_utc
from search.base import MockedESTestCase


BASE_URL = "http://base.url/"


@ddt
class ProgramTests(MockedESTestCase):
    """Tests for Program model"""

    def test_to_string(self):
        """Test for __str__ method"""
        prog = ProgramFactory.build(title="Title")
        assert "{}".format(prog) == "Title"

    def create_frozen_run(self, course):
        """helper function to create frozen course runs"""

        now = now_in_utc()
        run = CourseRunFactory.create(
            course=course,
            title="Title Run",
            freeze_grade_date=now - timedelta(weeks=1),
        )
        CourseRunGradingStatus.objects.create(course_run=run, status='complete')
        return run

    @data(
        [True, True, True],
        [False, True, False],
        [True, False, False],
        [False, False, False],
    )
    @unpack
    def test_complete(self, first_has_frozen, second_has_frozen, result):
        """
        Test has_frozen_grades_for_all_courses
        """
        course_1 = CourseFactory.create(title="Title")
        course_2 = CourseFactory.create(title="Title", program=course_1.program)
        if first_has_frozen:
            self.create_frozen_run(course_1)
        if second_has_frozen:
            self.create_frozen_run(course_2)

        assert course_1.program.has_frozen_grades_for_all_courses() is result


def from_weeks(weeks, now=None):
    """Helper function to get a date adjusted by a number of weeks"""
    if weeks is None:
        return None
    if now is None:
        now = now_in_utc()
    return now + timedelta(weeks=weeks)


class CourseModelTests(MockedESTestCase):
    """Mixin for Course models"""

    @classmethod
    def setUpTestData(cls):
        super(CourseModelTests, cls).setUpTestData()
        cls.course = CourseFactory.create(title="Title")

    def setUp(self):
        super(CourseModelTests, self).setUp()
        self.now = now_in_utc()

    def create_run(self, course=None, start=None, end=None,
                   enr_start=None, enr_end=None, upgrade_deadline=None,
                   freeze_grade_date=None):
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
            freeze_grade_date=freeze_grade_date,
        )

    def from_weeks(self, weeks):
        """Helper function to get a date adjusted by a number of weeks"""
        return from_weeks(weeks, self.now)


class HasFrozenRunsTests(CourseModelTests):
    """Test has_frozen_runs"""

    def test_no_run(self):
        """
        The course has no runs
        """
        assert self.course.has_frozen_runs() is False

    def test_no_frozen_runs(self):
        """
        The course has run with no grading status
        """
        now = now_in_utc()
        self.create_run(freeze_grade_date=now - timedelta(weeks=1))
        assert self.course.has_frozen_runs() is False

    def test_has_frozen_run(self):
        """
        The course has one frozen run
        """
        now = now_in_utc()
        course_run = self.create_run(freeze_grade_date=now - timedelta(weeks=1))
        CourseRunGradingStatus.objects.create(course_run=course_run, status='complete')

        assert self.course.has_frozen_runs() is True

    def test_has_frozen_run_and_another_run(self):
        """
        The course has one frozen run, and a run with no grading status
        """
        now = now_in_utc()
        course_run = self.create_run(freeze_grade_date=now - timedelta(weeks=1))
        CourseRunGradingStatus.objects.create(course_run=course_run, status='complete')
        self.create_run()
        assert self.course.has_frozen_runs() is True

    def test_has_frozen_run_and_pending(self):
        """
        The course has a run with pending status
        """
        now = now_in_utc()
        not_frozen_run = self.create_run(freeze_grade_date=now - timedelta(weeks=1))
        CourseRunGradingStatus.objects.create(course_run=not_frozen_run, status='pending')
        assert self.course.has_frozen_runs() is False


# Silencing a pylint warning caused by ddt
# pylint: disable=too-many-arguments
@ddt
class FirstUnexpiredRunTests(CourseModelTests):  # pylint: disable=too-many-public-methods
    """Tests for first_unexpired_run function"""

    def test_no_run(self):
        """
        No run available
        """
        assert self.course.first_unexpired_run() is None

    @data(
        # course past, enrollment past
        [-52, -45, -62, -53, False],
        # course present, enrollment past
        [-1, 2, -10, -3, False],
        # course future, enrollment past
        [1, 3, -10, -3, False],
        # course past, enrollment none
        [-10, -3, None, None, False],
        # course started in past with no end, enrollment none
        [-52, None, None, None, True],
        # course future, enrollment present
        [1, 4, -10, 1, True],
        # course present, enrollment present
        [-1, 2, -10, 1, True],
        # course present, enrollment past with no end
        [-1, 2, -10, None, True],
        # course future, enrollment future
        [52, 62, 40, 50, True],
        # course future, enrollment none
        [1, 4, None, None, True],
    )
    @unpack
    def test_run(self, start_weeks, end_weeks, enr_start_weeks, enr_end_weeks, is_run):
        """
        Test first_unexpired_run for different values
        """
        course_run = self.create_run(
            start=self.from_weeks(start_weeks),
            end=self.from_weeks(end_weeks),
            enr_start=self.from_weeks(enr_start_weeks),
            enr_end=self.from_weeks(enr_end_weeks),
        )
        unexpired_run = self.course.first_unexpired_run()
        if is_run:
            assert unexpired_run == course_run
        else:
            assert unexpired_run is None

    def test_present_enroll_open_with_future_present(self):
        """
        one run with enrollment present and course present
        and one run with enrollment future and course future
        """
        course_run = self.create_run(
            start=self.from_weeks(-1),
            end=self.from_weeks(2),
            enr_start=self.from_weeks(-10),
            enr_end=self.from_weeks(1),
        )
        self.create_run(
            start=self.now+timedelta(52),
            end=self.from_weeks(62),
            enr_start=self.from_weeks(40),
            enr_end=self.from_weeks(50),
        )
        next_run = self.course.first_unexpired_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_present_enroll_closed_with_future_present(self):
        """
        one run with enrollment past and course present
        and one run with enrollment future and course future
        """
        self.create_run(
            start=self.from_weeks(-1),
            end=self.from_weeks(2),
            enr_start=self.from_weeks(-10),
            enr_end=self.from_weeks(-1),
        )
        course_run = self.create_run(
            start=self.from_weeks(52),
            end=self.from_weeks(62),
            enr_start=self.from_weeks(40),
            enr_end=self.from_weeks(50),
        )
        next_run = self.course.first_unexpired_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run.pk

    def test_exclude_course_run(self):
        """
        Two runs, one of which will be excluded from the results
        because the upgrade deadline for that course has passed.
        """
        # course run earlier
        self.create_run(
            start=self.from_weeks(-2),
            end=self.from_weeks(10),
            enr_start=self.from_weeks(-5),
            enr_end=self.from_weeks(-1),
            upgrade_deadline=self.from_weeks(-1),
        )
        course_run_later = self.create_run(
            start=self.from_weeks(-1),
            end=self.from_weeks(11),
            enr_start=self.from_weeks(0),
            enr_end=self.from_weeks(5),
        )
        next_run = self.course.first_unexpired_run()
        assert isinstance(next_run, CourseRun)
        assert next_run.pk == course_run_later.pk


@ddt
class CourseTests(CourseModelTests):  # pylint: disable=too-many-public-methods
    """Tests for Courses"""

    def test_to_string(self):
        """Test for __str__ method"""
        assert "{}".format(self.course) == "Title"

    @data(
        # course starts in future, enrollment future
        [1, 10, 1, 2, 'Starts {:%b %-d, %Y} - Enrollment {:%m/%Y}'.format(from_weeks(1), from_weeks(1))],
        # course starts in future, enrollment open
        [1, 10, -1, 10, 'Starts {:%b %-d, %Y} - Enrollment Open'.format(from_weeks(1))],
        # course starts in future, enrollment open with no end
        [1, 10, -1, None, 'Starts {:%b %-d, %Y} - Enrollment Open'.format(from_weeks(1))],
        # course starts in future, no enrollment dates
        [1, 10, None, None, 'Starts {:%b %-d, %Y}'.format(from_weeks(1))],
        # course is currently running, enrollment is open, ending soon
        [-1, 10, -1, 10, 'Ongoing - Enrollment Ends {:%b %-d, %Y}'.format(from_weeks(10))],
        # course is currently running without end, enrollment is open, no end
        [-1, None, -1, None, 'Ongoing - Enrollment Open'],
        # course is currently running, enrollment is closed
        [-1, 10, -2, -1, 'Not available'],
    )
    @unpack
    def test_enrollment_text(self, start, end, enr_start, enr_end, expected):
        """Tests for enrollment_text"""
        self.create_run(
            start=self.from_weeks(start),
            end=self.from_weeks(end),
            enr_start=self.from_weeks(enr_start),
            enr_end=self.from_weeks(enr_end),
        )
        assert self.course.enrollment_text == expected

    def test_course_fuzzy_start_date(self):
        """Test course with promised course run"""
        CourseRunFactory.create(
            course=self.course,
            fuzzy_start_date="Fall 2017",
            start_date=None,
            end_date=None,
            enrollment_start=None,
            enrollment_end=None,
        )
        assert self.course.enrollment_text == 'Coming Fall 2017'

    def test_url_with_no_run(self):
        """Test course url with no course runs"""
        course = CourseFactory.create()
        assert course.url == ""

    def test_url_with_empty_course_key(self):
        """Course with no course key or enrollment_url should have empty url"""
        course_run = CourseRunFactory.create(
            course=self.course,
            start_date=self.from_weeks(-1),
            end_date=None,
            enrollment_start=self.from_weeks(-1),
            enrollment_end=None,
            enrollment_url=None,
            edx_course_key=None,
        )
        assert course_run.course.url == ""

    def test_enrollment_url(self):
        """If both enrollment_url and edx_course_key are available, use enrollment_url"""
        course_run = CourseRunFactory.create(
            course=self.course,
            start_date=self.from_weeks(-1),
            end_date=None,
            enrollment_start=self.from_weeks(-1),
            enrollment_end=None,
            enrollment_url="http://enrollment.url/",
            edx_course_key="course_key"
        )
        assert course_run.course.url == "http://enrollment.url/"

    @override_settings(EDXORG_BASE_URL=BASE_URL)
    def test_url_with_course_key(self):
        """Test course url with a course key and no enrollment_url"""
        course_run = CourseRunFactory.create(
            course=self.course,
            start_date=self.from_weeks(-1),
            end_date=None,
            enrollment_start=self.from_weeks(-1),
            enrollment_end=None,
            enrollment_url=None,
            edx_course_key="course_key"
        )
        expected = urljoin(
            BASE_URL,
            'courses/{key}/about'.format(key=course_run.edx_course_key)
        )
        assert course_run.course.url == expected

    def test_has_exam(self):
        """test that creating an exam run makes has_exam == true"""
        assert self.course.has_exam is False
        ExamRunFactory.create(course=self.course)
        assert self.course.has_exam is True


@ddt
class CourseRunTests(CourseModelTests):
    """Tests for Course Run model"""

    def test_to_string(self):
        """Test for __str__ method"""
        course_run = self.create_run()
        assert "{}".format(course_run) == "Title Run"

    def test_save(self):
        """
        Test that save method treats blank and null edx_course_key
        values as null
        """
        test_run = CourseRun.objects.create(
            course=self.course,
            title='test_run'
        )
        test_run_blank_edx_key = CourseRun.objects.create(
            course=self.course,
            title='test_run_blank_edx_key',
            edx_course_key=''
        )
        assert test_run.edx_course_key is None
        assert test_run_blank_edx_key.edx_course_key is None

    @data(
        # no start or end
        [None, None, False],
        # end is in future
        [None, 1, False],
        # start is in past
        [-1, None, True],
        # start is in future
        [1, None, False],
        # start and end is in past
        [-2, -1, False],
        # start is in past, end is in future
        [-2, 1, True],
        # start and end are in future
        [1, 2, False],
        # start is in future, end is in past
        [1, -2, False],
    )
    @unpack
    def test_is_current(self, start, end, expected):
        """Test is_current"""
        course_run = self.create_run(
            start=self.from_weeks(start),
            end=self.from_weeks(end),
        )
        assert course_run.is_current is expected

    @data(
        # no start or end
        [None, None, False],
        # end is in future
        [None, 2, False],
        # end is in past
        [None, -2, True],
    )
    @unpack
    def test_is_past(self, start, end, expected):
        """Test for is_past property"""
        course_run = self.create_run(
            start=self.from_weeks(start),
            end=self.from_weeks(end),
        )
        assert course_run.is_past is expected

    @data(
        # no start or end
        [None, None, False],
        # start is in future
        [2, None, True],
        # start is in past
        [-2, None, False],
    )
    @unpack
    def test_is_future(self, start, end, expected):
        """Test for is_future property"""
        course_run = self.create_run(
            start=self.from_weeks(start),
            end=self.from_weeks(end),
        )
        assert course_run.is_future is expected

    @data(
        # no start date
        [None, None, None, None, False],
        # with start in the future, no enrollment start
        [2, None, None, None, False],
        # enrollment start is in past, no enrollment end
        [2, None, -3, None, True],
        # enrollment start and end are in past
        [2, None, -3, -1, False],
        # enrollment start and end are in future
        [2, None, -3, 3, True],
        # enrollment start is in future, no enrollment end
        [2, None, 1, None, False],
    )
    @unpack
    def test_is_future_enrollment_open(self, start, end, enr_start, enr_end, expected):
        """Test for is_future_enrollment_open property"""
        course_run = self.create_run(
            start=self.from_weeks(start),
            end=self.from_weeks(end),
            enr_start=self.from_weeks(enr_start),
            enr_end=self.from_weeks(enr_end),
        )
        assert course_run.is_future_enrollment_open is expected

    @data(
        # No upgrade deadline
        [None, True],
        # Upgrade deadline is in future
        [2, True],
        # Upgrade deadline is in past
        [-2, False],
    )
    @unpack
    def test_is_upgradable(self, upgrade_deadline, expected):
        """Test for is_upgradable property"""
        course_run = self.create_run(
            upgrade_deadline=self.from_weeks(upgrade_deadline)
        )
        assert course_run.is_upgradable is expected

    @data(
        # freeze in the past
        (-1, True),
        # freeze in the future
        (1, False),
    )
    @unpack
    def test_can_freeze_grades(self, freeze_date, expected):
        """Test for the can_freeze_grades property"""
        course_run = self.create_run(
            freeze_grade_date=self.from_weeks(freeze_date)
        )
        assert course_run.can_freeze_grades is expected

    def test_can_freeze_grades_raises(self):
        """Test for the can_freeze_grades property raises if not configured"""
        course_run = self.create_run()
        with self.assertRaises(ImproperlyConfigured):
            course_run.can_freeze_grades  # pylint: disable=pointless-statement

    def test_get_runs_to_freeze(self):
        """Test for the get_runs_to_freeze classmethod"""
        course_runs = []
        for week_increment in (-1, -2, 1, None):
            course_runs.append(self.create_run(
                freeze_grade_date=self.from_weeks(week_increment)
            ))
        CourseRunGradingStatus.objects.create(
            course_run=course_runs[1],
            status=FinalGradeStatus.COMPLETE
        )
        runs_to_freeze = CourseRun.get_freezable()
        freeze_run_ids = [course_run.pk for course_run in runs_to_freeze]
        assert course_runs[0].pk in freeze_run_ids
        for run in course_runs[1:]:
            assert run.pk not in freeze_run_ids

    def test_has_future_exam(self):
        """Test course has exam"""
        course_run = self.create_run()

        assert course_run.has_future_exam is False
        exam_run = ExamRunFactory.create(course=course_run.course)
        assert course_run.has_future_exam is True
        exam_run.delete()

        assert course_run.has_future_exam is False
        exam_run = ExamRunFactory.create(
            course=course_run.course,
            date_last_eligible=now_in_utc().date(),
        )
        assert course_run.has_future_exam is False
        exam_run.delete()

        assert course_run.has_future_exam is False
        ExamRunFactory.create(
            course=course_run.course,
            date_last_eligible=(now_in_utc() - timedelta(days=1)).date(),
        )
        assert course_run.has_future_exam is False
