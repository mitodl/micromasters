"""
Tests for alter_data commands
"""
from decimal import Decimal

import ddt

from courses.factories import CourseRunFactory
from dashboard.factories import ProgramEnrollmentFactory
from dashboard.utils import get_mmtrack
from micromasters.factories import UserFactory
from search.base import MockedESTestCase
from seed_data.management.commands.alter_data import (set_to_enrolled,
                                                      set_to_failed,
                                                      set_to_passed)


@ddt.ddt
class AlterDataCommandTests(MockedESTestCase):
    """Test cases for alter_data commands"""
    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory.create(username='username1', email='email1@example.com')
        cls.course_runs = {
            'fa': CourseRunFactory.create(course__program__financial_aid_availability=True),
            'non_fa': CourseRunFactory.create(course__program__financial_aid_availability=False)
        }
        for course_run in cls.course_runs.values():
            ProgramEnrollmentFactory.create(user=cls.user, program=course_run.course.program)

    @ddt.data('fa', 'non_fa')
    def test_set_to_passed(self, course_run_program_type):
        """set_to_passed should set a CourseRun to passed for a given User"""
        course_run = self.course_runs[course_run_program_type]
        grade = Decimal('0.75')
        set_to_passed(user=self.user, course_run=course_run, grade=grade)
        mmtrack = get_mmtrack(self.user, course_run.course.program)
        assert mmtrack.has_passed_course_run(course_run.edx_course_key)
        assert int(mmtrack.get_final_grade_percent(course_run.edx_course_key)) == (grade * 100)

    @ddt.data('fa', 'non_fa')
    def test_set_to_failed(self, course_run_program_type):
        """set_to_failed should set a CourseRun to failed for a given User"""
        course_run = self.course_runs[course_run_program_type]
        grade = Decimal('0.55')
        set_to_failed(user=self.user, course_run=course_run, grade=grade)
        mmtrack = get_mmtrack(self.user, course_run.course.program)
        assert not mmtrack.has_passed_course_run(course_run.edx_course_key)
        assert int(mmtrack.get_final_grade_percent(course_run.edx_course_key)) == (grade * 100)

    @ddt.data('fa', 'non_fa')
    def test_set_payment_status(self, course_run_program_type):
        """Commands that set a User's payment status should work based on the audit flag value"""
        course_run = self.course_runs[course_run_program_type]
        for audit_setting in (True, False):
            set_to_enrolled(user=self.user, course_run=course_run, audit=audit_setting)
            mmtrack = get_mmtrack(self.user, course_run.course.program)
            assert mmtrack.has_paid(course_run.edx_course_key) is not audit_setting
