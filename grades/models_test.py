"""
Tests for grades models
"""
from django.core.exceptions import ValidationError
import ddt

from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
)
from exams.pearson.constants import EXAM_GRADE_PASS, EXAM_GRADE_FAIL
from grades.models import (
    CourseRunGradingAlreadyCompleteError,
    CourseRunGradingStatus,
    FinalGrade,
    MicromastersCourseCertificate,
    MicromastersProgramCertificate,
    MicromastersProgramCommendation)
from grades.constants import FinalGradeStatus
from grades.factories import ProctoredExamGradeFactory
from grades.models import ProctoredExamGrade
from micromasters.factories import UserFactory
from micromasters.utils import generate_md5
from search.base import MockedESTestCase


class FinalGradeModelTests(MockedESTestCase):
    """
    Tests for final grade model
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user1 = UserFactory.create()
        cls.user2 = UserFactory.create()
        cls.course_run = CourseRunFactory.create()
        cls.grade1 = FinalGrade.objects.create(
            user=cls.user1,
            course_run=cls.course_run,
            grade=0.65,
        )

    def test_grade_validation_save(self):
        """
        Tests that the save method performs a full validation of the rade input
        """
        # it fails to modify it to a value >1 or <0
        for val in (-0.5, 1.3, ):
            with self.assertRaises(ValidationError):
                self.grade1.grade = val
                self.grade1.save()

        # it fails also to create the grades from scratch
        for val in (-0.5, 1.3, ):
            with self.assertRaises(ValidationError):
                FinalGrade.objects.create(
                    user=self.user2,
                    course_run=self.course_run,
                    grade=val,
                )

    def test_grade_percent(self):
        """
        test for grade_percent property method
        """
        assert self.grade1.grade_percent == 65.0

        self.grade1.grade = 0.0
        self.grade1.save()
        assert self.grade1.grade_percent == 0.0


class CourseRunGradingStatusTests(MockedESTestCase):
    """
    Tests for CourseRunGradingStatus methods
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.course_run_pending = CourseRunFactory.create()
        cls.course_run_complete = CourseRunFactory.create()
        cls.course_run_no_status = CourseRunFactory.create()
        cls.all_runs = (cls.course_run_pending, cls.course_run_complete, cls.course_run_no_status, )
        CourseRunGradingStatus.objects.create(
            course_run=cls.course_run_pending,
            status=FinalGradeStatus.PENDING,
        )
        CourseRunGradingStatus.objects.create(
            course_run=cls.course_run_complete,
            status=FinalGradeStatus.COMPLETE,
        )

    def test_is_complete(self):
        """tests for is_complete method"""
        assert CourseRunGradingStatus.is_complete(self.course_run_pending) is False
        assert CourseRunGradingStatus.is_complete(self.course_run_complete) is True
        assert CourseRunGradingStatus.is_complete(self.course_run_no_status) is False

    def test_is_pending(self):
        """tests for is_pending method"""
        assert CourseRunGradingStatus.is_pending(self.course_run_pending) is True
        assert CourseRunGradingStatus.is_pending(self.course_run_complete) is False
        assert CourseRunGradingStatus.is_pending(self.course_run_no_status) is False

    def test_set_to_complete(self):
        """tests for set_to_complete method"""
        assert CourseRunGradingStatus.is_complete(self.course_run_pending) is False
        assert CourseRunGradingStatus.is_complete(self.course_run_complete) is True
        assert CourseRunGradingStatus.is_complete(self.course_run_no_status) is False
        for course_run in self.all_runs:
            CourseRunGradingStatus.set_to_complete(course_run)
            assert CourseRunGradingStatus.is_complete(course_run) is True

    def test_create_pending(self):
        """tests for create_pending"""
        for course_run in (self.course_run_pending, self.course_run_no_status, ):
            fg_status = CourseRunGradingStatus.create_pending(course_run)
            assert fg_status.status == FinalGradeStatus.PENDING
            assert fg_status.course_run == course_run

        with self.assertRaises(CourseRunGradingAlreadyCompleteError):
            CourseRunGradingStatus.create_pending(self.course_run_complete)


@ddt.ddt
class ProctoredExamGradeTests(MockedESTestCase):
    """Tests for ProctoredExamGrade"""

    def test_for_user_course(self):
        """Tests that for_user_course() does not return unavailable grades"""
        user = UserFactory.create()
        course = CourseFactory.create()
        available_grade = ProctoredExamGradeFactory.create(
            user=user,
            course=course,
            exam_run__course=course,
            exam_run__eligibility_past=True
        )
        ProctoredExamGradeFactory.create(
            user=user,
            course=course,
            exam_run__course=course,
            exam_run__eligibility_future=True
        )
        grades = ProctoredExamGrade.for_user_course(user, course)

        assert list(grades) == [available_grade]

    @ddt.data(
        (5.0, True, EXAM_GRADE_PASS),
        (0.0, True, EXAM_GRADE_PASS),
        (-5.0, False, EXAM_GRADE_FAIL),
    )
    @ddt.unpack
    def test_set_score(self, grade_adjust, expected_passed_value, expected_grade_str):
        """Tests that the set_score helper method sets score-related fields appropriately"""
        passing_score = 60.0
        grade = ProctoredExamGradeFactory.build(
            passing_score=passing_score,
            score=None,
            percentage_grade=None,
            passed=None,
        )
        grade.set_score(passing_score + grade_adjust)
        assert grade.score == passing_score + grade_adjust
        assert grade.percentage_grade == grade.score / 100.0
        assert grade.passed == expected_passed_value
        assert grade.grade == expected_grade_str

    def test_set_score_none(self):
        """Tests that set_score fails if the provided score is None"""
        grade = ProctoredExamGradeFactory.build()
        with self.assertRaises(TypeError):
            grade.set_score(None)


class MicromastersCourseCertificateTests(MockedESTestCase):
    """Tests for MicromastersCourseCertificate"""

    def test_autogenerated_hash(self):
        """Test that MicromastersCourseCertificate auto-generates a hash when none is provided"""
        user = UserFactory.create()
        course = CourseFactory.create()
        mm_certificate = MicromastersCourseCertificate.objects.create(user=user, course=course)
        assert len(mm_certificate.hash) == 32
        assert mm_certificate.hash == generate_md5('{}|{}'.format(user.id, course.id).encode('utf-8'))


class MicromastersProgramCertificateTests(MockedESTestCase):
    """Tests for MicromastersProgramCertificate"""

    def test_autogenerated_hash(self):
        """Test that MicromastersProgramCertificate auto-generates a hash when none is provided"""
        user = UserFactory.create()
        program = ProgramFactory.create()

        mm_certificate = MicromastersProgramCertificate.objects.create(user=user, program=program)
        assert len(mm_certificate.hash) == 32
        assert mm_certificate.hash == generate_md5('{}|{}'.format(user.id, program.id).encode('utf-8'))


class MicromastersProgramCommendationTests(MockedESTestCase):
    """Tests for MicromastersProgramCommendation"""

    def test_autogenerated_uuid(self):
        """Test that MicromastersProgramCommendation auto-generates a unique uuid."""
        user = UserFactory.create()
        user_1 = UserFactory.create()
        program = ProgramFactory.create()

        letter = MicromastersProgramCommendation.objects.create(user=user, program=program)
        letter_1 = MicromastersProgramCommendation.objects.create(user=user_1, program=program)
        assert letter.uuid != letter_1.uuid
