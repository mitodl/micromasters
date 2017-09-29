"""
Tests for grades tasks
"""
from datetime import timedelta
import pytest
import factory
from courses.factories import CourseFactory
from exams.factories import ExamRunFactory
from grades import tasks
from grades.factories import (
    FinalGradeFactory,
    ProctoredExamGradeFactory,
)
from grades.models import MicromastersCourseCertificate
from micromasters.utils import now_in_utc

pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.django_db,
]


def test_generate_course_certificates():
    """
    Test that generate_course_certificates_for_fa_students creates certificates for appropriate FinalGrades
    """
    course = CourseFactory.create(program__financial_aid_availability=True)
    # Create two exam runs for course with different date_grades_available
    exam_run_grades_available = ExamRunFactory.create(
        course__program__financial_aid_availability=True,
        date_grades_available=now_in_utc() - timedelta(weeks=1))
    course_with_exams = exam_run_grades_available.course
    exam_run_no_grades = ExamRunFactory.create(
        course=course_with_exams,
        date_grades_available=now_in_utc() + timedelta(weeks=1))
    # Another non-fa course
    non_fa_course = CourseFactory.create(program__financial_aid_availability=False)
    # Create FinalGrade records with different courses and a mix of passed and failed outcomes
    passed_final_grades = FinalGradeFactory.create_batch(4, course_run__course=course, passed=True)
    passed_final_grades_with_exam = FinalGradeFactory.create_batch(
        6,
        course_run__course=course_with_exams,
        passed=True
    )
    FinalGradeFactory.create(course_run__course=non_fa_course, passed=True)
    FinalGradeFactory.create(course_run__course=course, passed=False)
    # Create ProctoredExamGrade records with a mix of passed and failed outcomes, and exam grade availability
    final_grades_with_passed_exam = passed_final_grades_with_exam[:2]
    final_grades_with_passed_exam_no_grades = passed_final_grades_with_exam[2:4]
    final_grades_with_failed_exam = passed_final_grades_with_exam[4:]
    ProctoredExamGradeFactory.create_batch(
        2,
        user=factory.Iterator([final_grade.user for final_grade in final_grades_with_passed_exam]),
        course=course_with_exams,
        exam_run=exam_run_grades_available,
        passed=True,
    )
    ProctoredExamGradeFactory.create_batch(
        2,
        user=factory.Iterator([final_grade.user for final_grade in final_grades_with_passed_exam_no_grades]),
        course=course_with_exams,
        exam_run=exam_run_no_grades,
        passed=True,
    )
    ProctoredExamGradeFactory.create_batch(
        2,
        user=factory.Iterator([final_grade.user for final_grade in final_grades_with_failed_exam]),
        course=course_with_exams,
        passed=False,
    )

    tasks.generate_course_certificates_for_fa_students.delay()

    # Make sure that certificates were created only for passed FinalGrades that either had no course exam, or had
    # a passed ProctoredExamGrade.
    created_certificates = MicromastersCourseCertificate.objects.all()
    assert len(created_certificates) == 6
    certificate_grade_ids = set([certificate.final_grade.id for certificate in created_certificates])
    expected_certificate_final_grades = passed_final_grades + final_grades_with_passed_exam
    assert certificate_grade_ids == set([final_grade.id for final_grade in expected_certificate_final_grades])
