"""
Tests for signals
"""
from unittest.mock import patch

from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import CourseFactory
from grades.factories import MicromastersCourseCertificateFactory, FinalGradeFactory, ProctoredExamGradeFactory
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase


# pylint: disable=unused-argument
@patch('search.signals.transaction.on_commit', side_effect=lambda callback: callback())
class CourseCertificateTests(MockedESTestCase):
    """
    Test certificate generation
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        with mute_signals(post_save):
            cls.user = ProfileFactory.create().user

        cls.final_grade = FinalGradeFactory.create(
            user=cls.user,
            passed=True,
        )

    @patch('grades.signals.generate_program_certificate', autospec=True)
    def test_create_course_certificate(self, generate_program_cert_mock, mock_on_commit):
        """
        Test that generate_program_certificate is called when a course
        certificate is created
        """
        program = self.final_grade.course_run.course.program
        cert = MicromastersCourseCertificateFactory.create(final_grade=self.final_grade)
        generate_program_cert_mock.assert_called_once_with(self.user, program)
        cert.save()
        generate_program_cert_mock.assert_called_once_with(self.user, program)


# pylint: disable=unused-argument
@patch('search.signals.transaction.on_commit', side_effect=lambda callback: callback())
class ProctoredExamGradesTests(MockedESTestCase):
    """
    Test certificate generation
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        with mute_signals(post_save):
            cls.user = ProfileFactory.create().user
            cls.course = CourseFactory.create()

    @patch('grades.signals.update_combined_final_grade', autospec=True)
    def test_create_exam_grade(self, update_grade_mock, mock_on_commit):
        """
        Test that update_combined_final_grade is called when a proctored exam
        grade is created or updated
        """
        exam_grade = ProctoredExamGradeFactory.create(user=self.user, course=self.course)
        update_grade_mock.assert_called_once_with(self.user, self.course)
        exam_grade.save()
        assert update_grade_mock.call_count == 2
        # create another exam grade for a different exam run
        ProctoredExamGradeFactory.create(user=self.user, course=self.course)
        assert update_grade_mock.call_count == 3
