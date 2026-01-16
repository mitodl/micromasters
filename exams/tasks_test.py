"""
Tests for exam tasks
"""
from unittest.mock import patch

from ddt import data, ddt

from dashboard.factories import ProgramEnrollmentFactory
from courses.factories import create_program
from exams.factories import (
    ExamRunFactory,
)
from exams.tasks import (
    authorize_exam_runs,
    authorize_enrollment_for_exam_run)
from search.base import MockedESTestCase


@ddt
class ExamRunTasksTest(MockedESTestCase):
    """Tests for ExamRun tasks"""

    @data(True, False)
    @patch('exams.tasks.authorize_for_latest_passed_course')
    def test_authorize_exam_runs(self, authorized, authorize_for_latest_passed_course_mock):
        """Test authorize_exam_runs()"""
        program, _ = create_program()
        course = program.course_set.first()
        enrollment = ProgramEnrollmentFactory.create(program=program)
        current_run = ExamRunFactory.create(course=course, authorized=authorized)
        past_run = ExamRunFactory.create(course=course, scheduling_future=True, authorized=authorized)
        future_run = ExamRunFactory.create(course=course, scheduling_past=True, authorized=authorized)
        authorize_exam_runs()

        if authorized:
            assert authorize_for_latest_passed_course_mock.call_count == 0
        else:
            assert authorize_for_latest_passed_course_mock.call_count == 2

            authorize_for_latest_passed_course_mock.assert_any_call(enrollment.user, current_run)
            authorize_for_latest_passed_course_mock.assert_any_call(enrollment.user, future_run)

            for exam_run in (current_run, future_run):
                exam_run.refresh_from_db()
                assert exam_run.authorized is True
            past_run.refresh_from_db()
            assert past_run.authorized is False

    @patch('exams.tasks.authorize_for_latest_passed_course')
    def test_authorize_enrollment_for_exam_run(self, authorize_for_latest_passed_course_mock):
        """Test authorize_enrollment_for_exam_run()"""
        program, _ = create_program()
        course = program.course_set.first()
        enrollment_1 = ProgramEnrollmentFactory.create(program=program)
        enrollment_2 = ProgramEnrollmentFactory.create(program=program)
        exam_run = ExamRunFactory.create(course=course)

        authorize_enrollment_for_exam_run([enrollment_1.id, enrollment_2.id], exam_run.id)

        assert authorize_for_latest_passed_course_mock.call_count == 2
        authorize_for_latest_passed_course_mock.assert_any_call(enrollment_1.user, exam_run)
        authorize_for_latest_passed_course_mock.assert_any_call(enrollment_2.user, exam_run)
