"""
Tests for grades tasks
"""
from datetime import timedelta
from unittest.mock import call

import pytest
import factory
from courses.factories import CourseFactory, CourseRunFactory, ProgramFactory
from exams.factories import ExamRunFactory
from grades import tasks
from grades.factories import (
    FinalGradeFactory,
    ProctoredExamGradeFactory,
)
from grades.models import MicromastersCourseCertificate, CombinedFinalGrade, CourseRunGradingStatus, FinalGrade
from micromasters.utils import now_in_utc

pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.django_db,
]


def test_generate_course_certificates():
    """
    Test that generate_course_certificates_for_fa_students creates certificates for appropriate FinalGrades
    """
    program = ProgramFactory.create(financial_aid_availability=True, live=True)
    week_ago = now_in_utc() - timedelta(weeks=1)
    # Course without exams
    course = CourseFactory.create(program=program)
    passed_final_grades = FinalGradeFactory.create_batch(
        4,
        course_run__course=course,
        course_run__freeze_grade_date=week_ago,
        passed=True
    )
    # create a duplicate final grade for course for user
    FinalGradeFactory.create(
        user=passed_final_grades[0].user,
        course_run__course=course,
        course_run__freeze_grade_date=week_ago,
        passed=True
    )
    # 2nd course for user
    course_2 = CourseFactory.create(program=program)
    FinalGradeFactory.create(
        course_run__course=course_2,
        course_run__freeze_grade_date=week_ago,
        passed=True,
        user=passed_final_grades[1].user
    )

    # Another non-fa course
    non_fa_course = CourseFactory.create(program__financial_aid_availability=False)

    # Course with exams
    # Create two exam runs for course with different date_grades_available
    exam_run_grades_available = ExamRunFactory.create(
        course__program=program,
        date_grades_available=now_in_utc() - timedelta(weeks=1))
    course_with_exams = exam_run_grades_available.course
    exam_run_no_grades = ExamRunFactory.create(
        course=course_with_exams,
        date_grades_available=now_in_utc() + timedelta(weeks=1))
    passed_final_grades_with_exam = FinalGradeFactory.create_batch(
        6,
        course_run__course=course_with_exams,
        passed=True
    )

    # Create ProctoredExamGrade records with a mix of passed and failed outcomes, and exam grade availability
    final_grades_with_passed_exam = passed_final_grades_with_exam[:2]

    ProctoredExamGradeFactory.create_batch(
        2,
        user=factory.Iterator([final_grade.user for final_grade in final_grades_with_passed_exam]),
        course=course_with_exams,
        exam_run=exam_run_grades_available,
        passed=True,
    )
    ProctoredExamGradeFactory.create_batch(
        2,
        user=factory.Iterator([final_grade.user for final_grade in passed_final_grades_with_exam[2:4]]),
        course=course_with_exams,
        exam_run=exam_run_no_grades,
        passed=True,
    )
    ProctoredExamGradeFactory.create_batch(
        2,
        user=factory.Iterator([final_grade.user for final_grade in passed_final_grades_with_exam[4:6]]),
        course=course_with_exams,
        passed=False,
    )
    # course runs need to have CourseRunGradingStatus to get certificates
    all_grades = FinalGrade.objects.filter(course_run__course__in=[course, course_2, course_with_exams, non_fa_course])
    for final_grade in all_grades:
        CourseRunGradingStatus.objects.create(course_run=final_grade.course_run, status='complete')
    tasks.generate_course_certificates_for_fa_students.delay()

    # Make sure that certificates were created only for passed and 'complete' status FinalGrades that either
    # had no course exam, or had a passed ProctoredExamGrade.
    certificates = MicromastersCourseCertificate.objects.filter(course__in=[course, course_2, course_with_exams])
    assert certificates.count() == 7
    expected_certificate_final_grades = passed_final_grades + final_grades_with_passed_exam
    assert set(certificates.values_list('user', flat=True)) == {
        final_grade.user.id for final_grade in expected_certificate_final_grades
    }


def test_create_combined_final_grade(mocker):
    """
    Test create_combined_final_grade creates the grade when it is missing
    """
    update_mock = mocker.patch('grades.api.update_or_create_combined_final_grade', autospec=True)
    course_run = CourseRunFactory.create(
        freeze_grade_date=now_in_utc()-timedelta(days=1),
        course__program__financial_aid_availability=True,
        course__program__live=True
    )
    course = course_run.course
    CourseRunGradingStatus.objects.create(course_run=course_run, status='complete')
    # Create exam run for course with date_grades_available True
    exam_run_grades_available = ExamRunFactory.create(
        course=course,
        date_grades_available=now_in_utc() - timedelta(weeks=1))

    exam_grades = ProctoredExamGradeFactory.create_batch(
        5,
        course=course,
        exam_run=exam_run_grades_available,
        passed=True,
    )
    for exam_grade in exam_grades[:3]:
        CombinedFinalGrade.objects.create(user=exam_grade.user, course=course, grade=0.7)
    # Only 3 users will have combined grades
    for exam_grade in exam_grades[3:]:
        FinalGradeFactory.create(user=exam_grade.user, course_run=course_run, passed=True)

    tasks.create_combined_final_grades.delay()

    assert update_mock.call_count == 2

    update_mock.assert_has_calls(
        [call(exam_grades[3].user, course), call(exam_grades[4].user, course)],
        any_order=True
    )
