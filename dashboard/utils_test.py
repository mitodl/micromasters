"""
Tests for the utils module
"""
from datetime import datetime, timedelta
from unittest.mock import (
    patch,
    MagicMock,
)

import pytz
import ddt

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from courses.models import ElectivesSet, ElectiveCourse
from dashboard.api_edx_cache import CachedEdxUserData
from dashboard.models import CachedEnrollment, CachedCertificate, CachedCurrentGrade
from dashboard.utils import MMTrack, convert_to_letter
from exams.factories import ExamProfileFactory, ExamAuthorizationFactory, ExamRunFactory
from exams.models import ExamProfile, ExamAuthorization
from grades.constants import NEW_COMBINED_FINAL_GRADES_DATE
from grades.factories import FinalGradeFactory, ProctoredExamGradeFactory
from grades.models import FinalGrade, CombinedFinalGrade, CourseRunGradingStatus
from micromasters.factories import UserFactory
from micromasters.utils import load_json_from_file, now_in_utc
from search.base import MockedESTestCase

# pylint: disable=too-many-arguments, too-many-lines


@ddt.ddt
class MMTrackTest(MockedESTestCase):
    """
    Tests for the MMTrack class
    """

    enrollments_json = load_json_from_file('dashboard/fixtures/user_enrollments.json')
    certificates_json = load_json_from_file('dashboard/fixtures/certificates.json')
    current_grades_json = load_json_from_file('dashboard/fixtures/current_grades.json')

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        cls.cached_edx_user_data = MagicMock(
            spec=CachedEdxUserData,
            enrollments=CachedEnrollment.deserialize_edx_data(cls.enrollments_json),
            certificates=CachedCertificate.deserialize_edx_data(cls.certificates_json),
            current_grades=CachedCurrentGrade.deserialize_edx_data(cls.current_grades_json),
        )

        # create the programs
        cls.program = ProgramFactory.create(live=True, price=1000)

        # create course runs for the normal program
        cls.course = CourseFactory.create(program=cls.program)
        expected_course_keys = [
            "course-v1:edX+DemoX+Demo_Course",
            "course-v1:MITx+8.MechCX+2014_T1",
            '',
            None,
            'course-v1:odl+FOO102+CR-FALL16'
        ]

        cls.cruns = []
        for course_key in expected_course_keys:
            course_run = CourseRunFactory.create(
                course=cls.course,
                edx_course_key=course_key
            )
            if course_key:
                cls.cruns.append(course_run)

    def pay_for_fa_course(self, course_id, status=None):  # pylint: disable=unused-argument
        """
        Helper function to pay for a financial aid course
        NOTE: Payments discontinued in 2021, this is now a no-op
        """

    def test_init(self):
        """
        Test of the init of the class for programs without financial aid
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        assert mmtrack.user == self.user
        assert mmtrack.program == self.program
        assert mmtrack.enrollments == self.cached_edx_user_data.enrollments
        assert mmtrack.current_grades == self.cached_edx_user_data.current_grades
        assert mmtrack.certificates == self.cached_edx_user_data.certificates
        assert mmtrack.edx_course_keys == {
            "course-v1:edX+DemoX+Demo_Course",
            "course-v1:MITx+8.MechCX+2014_T1",
            "course-v1:odl+FOO102+CR-FALL16"
        }

    def test_is_course_in_program(self):
        """
        Test the _is_course_in_program method
        """
        # pylint: disable=protected-access
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        for course_id in ["course-v1:edX+DemoX+Demo_Course", "course-v1:MITx+8.MechCX+2014_T1"]:
            assert mmtrack._is_course_in_program(course_id) is True
        assert mmtrack._is_course_in_program("course-v1:odl+FOO101+CR-FALL15") is False

    def test_is_enrolled(self):
        """
        Tests for is_enrolled method
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        for course_id in ["course-v1:edX+DemoX+Demo_Course", "course-v1:MITx+8.MechCX+2014_T1"]:
            assert mmtrack.is_enrolled(course_id) is True
            with patch('edx_api.enrollments.models.Enrollments.is_enrolled_in', return_value=False):
                assert mmtrack.is_enrolled(course_id) is False

        # Removed financial aid program enrollment tests

    def test_is_enrolled_mmtrack_normal(self):
        """
        Tests for the is_enrolled_mmtrack method in case financial aid is not available
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        # this is a verified enrollment from edx
        assert mmtrack.is_enrolled_mmtrack("course-v1:edX+DemoX+Demo_Course") is True
        # this is a audit enrollment from edx
        assert mmtrack.is_enrolled_mmtrack("course-v1:MITx+8.MechCX+2014_T1") is False

    @ddt.data(True, False)
    def test_has_passed_course_run(self, final_grade_passed):
        """
        Test that has_passed_course_run returns True when a passed FinalGrade exists
        """
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run=self.cruns[0],
            passed=final_grade_passed
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_passed_course_run(final_grade.course_run.edx_course_key) is final_grade_passed

    def test_has_passed_course_run_no_grade(self):
        """
        Test that has_passed_course_run returns False when no FinalGrade exists
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_passed_course_run('random-course-id') is False

    def test_get_final_grade_percent(self):
        """
        Test that get_final_grade_percent returns a final grade in percent form
        """
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run=self.cruns[0],
            grade=0.57
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        # calling round here because we do not want to add it in `get_final_grade` and let the frontend handle it
        assert round(mmtrack.get_final_grade_percent(final_grade.course_run.edx_course_key)) == 57.0

    def test_get_final_grade_percent_none(self):
        """
        Test that get_final_grade_percent returns a None when there is no final grade
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.get_final_grade_percent('random-course-id') is None

    def test_has_final_grade(self):
        """
        Test that has_final_grade returns True when a FinalGrade exists
        """
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run=self.cruns[0]
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_final_grade(final_grade.course_run.edx_course_key) is True
        assert mmtrack.has_final_grade('random-course-id') is False

    def test_get_final_grade(self):
        """
        Test that get_final_grade returns the FinalGrade associated with a user's course run
        """
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run=self.cruns[0],
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.get_final_grade(final_grade.course_run.edx_course_key) == final_grade

    def test_get_final_grade_none(self):
        """
        Test for get_final_grade returns None if there is no associated FinalGrade
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.get_final_grade('random-course-id') is None

    def test_get_required_final_grade(self):
        """
        Test that get_required_final_grade returns the FinalGrade associated with a user's course run
        """
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run=self.cruns[0],
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.get_required_final_grade(final_grade.course_run.edx_course_key) == final_grade

    def test_get_required_final_grade_raises(self):
        """
        Test for get_required_final_grade raises an exception if there is no associated FinalGrade
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        with self.assertRaises(FinalGrade.DoesNotExist):
            mmtrack.get_required_final_grade('random-course-id')

    def test_get_current_grade(self):
        """
        Test for get_current_grade method
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.get_current_grade("course-v1:edX+DemoX+Demo_Course") == 77.0
        assert mmtrack.get_current_grade("course-v1:MITx+8.MechCX+2014_T1") == 3.0
        assert mmtrack.get_current_grade("course-v1:odl+FOO101+CR-FALL15") is None

        # case when the grade is not available from edx
        with patch('edx_api.grades.models.CurrentGradesByUser.get_current_grade', return_value=None):
            assert mmtrack.get_current_grade("course-v1:MITx+8.MechCX+2014_T1") is None

    def test_count_courses_passed_normal(self):
        """
        Assert that count_courses_passed works in case of normal program.
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.count_courses_passed() == 0
        course_run = self.cruns[0]
        FinalGradeFactory.create(
            user=self.user,
            course_run=course_run,
            passed=True
        )
        assert mmtrack.count_courses_passed() == 1

        course = CourseFactory.create(program=self.program)
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run__course=course,
            passed=True
        )
        mmtrack.edx_course_keys.add(final_grade.course_run.edx_course_key)
        assert mmtrack.count_courses_passed() == 2

    # Removed test_count_courses_passed_fa (financial aid logic)

    # Removed test_count_courses_mixed_fa (financial aid logic)

    def test_get_number_of_passed_courses_for_completion(self):
        """
        Assert that get_number_of_passed_courses_for_completion computes a number of courses passed for
        programs with elective sets
        """
        course_run = self.cruns[0]
        FinalGradeFactory.create(
            user=self.user,
            course_run=course_run,
            passed=True
        )
        electives_set = ElectivesSet.objects.create(program=self.program, required_number=1)
        elective_cruns = []

        for _ in range(2):
            run = CourseRunFactory.create(
                course__program=self.program
            )
            FinalGradeFactory.create(
                user=self.user,
                course_run=run,
                passed=True,
                status='complete',
                grade=0.7
            )
            elective_cruns.append(run)
            CourseRunGradingStatus.objects.create(course_run=run, status='complete')
            ElectiveCourse.objects.create(course=run.course, electives_set=electives_set)
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        # passed 2 electives here, but only one is required for completion of the program
        assert mmtrack.count_courses_passed() == 3
        assert mmtrack.get_number_of_passed_courses_for_completion() == 2

    def test_get_number_of_passed_courses_for_completion_no_electives(self):
        """
        test get_number_of_passed_courses_for_completion returns number of passed courses if no electives
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        for course_run in self.cruns:
            FinalGradeFactory.create(
                user=self.user,
                course_run=course_run,
                passed=True
            )
        assert mmtrack.get_number_of_passed_courses_for_completion() == 1

    def test_count_passing_courses_for_keys(self):
        """
        Assert that count_courses_passed works in case of normal program.
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.count_passing_courses_for_keys(mmtrack.edx_course_keys) == 0
        for crun_index in [0, 1]:
            course_run = self.cruns[crun_index]
            FinalGradeFactory.create(
                user=self.user,
                course_run=course_run,
                passed=True
            )
            assert mmtrack.count_passing_courses_for_keys(mmtrack.edx_course_keys) == 1

        # now create a grade for another course
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run__course__program=self.program,
            passed=True
        )
        mmtrack.edx_course_keys.add(final_grade.course_run.edx_course_key)
        assert mmtrack.count_passing_courses_for_keys(mmtrack.edx_course_keys) == 2

    # Removed test_not_paid_fa_with_course_run_paid_on_edx (financial aid logic)

    # Removed test_not_paid_fa_with_enrollment_verified_on_edx (financial aid logic)

    @ddt.data(
        ("verified", True, True),
        ("audit", False, False),
        ("verified", False, False),
    )
    @ddt.unpack
    def test_has_passing_certificate(self, certificate_type, is_passing, expected_result):
        """
        Test for has_passing_certificate method with different type of certificates
        """
        course_key = self.cruns[2].edx_course_key  # Use course without existing cert
        cert_json = {
            "username": "staff",
            "course_id": course_key,
            "certificate_type": certificate_type,
            "is_passing": is_passing,
            "status": "downloadable",
            "download_url": "http://www.example.com/demo.pdf",
            "grade": "0.98"
        }
        cached_edx_user_data = MagicMock(
            spec=CachedEdxUserData,
            enrollments=CachedEnrollment.deserialize_edx_data(self.enrollments_json),
            certificates=CachedCertificate.deserialize_edx_data(self.certificates_json + [cert_json]),
            current_grades=CachedCurrentGrade.deserialize_edx_data(self.current_grades_json),
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=cached_edx_user_data
        )
        assert mmtrack.has_passing_certificate(course_key) is expected_result

    # Removed test_has_passing_certificate_fa (financial aid logic)

    # Removed test_get_program_certificate_url (financial aid logic)

    # Removed test_get_program_letter_url (financial aid logic)

    def test_get_best_final_grade_for_course(self):
        """
        Test for get_best_final_grade_for_course to return the highest grade over all course runs
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        course = self.cruns[0].course

        FinalGradeFactory.create(user=self.user, course_run=self.cruns[0], grade=0.3, passed=False)
        assert mmtrack.get_best_final_grade_for_course(course) is None

        for grade in [0.3, 0.5, 0.8]:
            course_run = CourseRunFactory.create(
                course=course,
            )
            FinalGradeFactory.create(user=self.user, course_run=course_run, grade=grade, passed=True)
        assert mmtrack.get_best_final_grade_for_course(course).grade == 0.8

    @ddt.data(True, False)
    def test_get_overall_final_grade_for_course(self, before_exam_merge):
        """
        Test for get_overall_final_grade_for_course to return CombinedFinalGrade for course
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        course = self.cruns[0].course
        course_run = self.cruns[0]
        assert mmtrack.get_overall_final_grade_for_course(course) == ""
        FinalGradeFactory.create(user=self.user, course_run=course_run, passed=True, grade=0.8)
        assert mmtrack.get_overall_final_grade_for_course(course) == "80"
        ExamRunFactory.create(course=course)
        if before_exam_merge:
            # if the course run end date is before Fall 2022
            course_run.start_date = NEW_COMBINED_FINAL_GRADES_DATE - timedelta(days=1)
            course_run.save()
            CombinedFinalGrade.objects.create(user=self.user, course=course, grade="74")
            assert mmtrack.get_overall_final_grade_for_course(course) == "74"
        else:
            course_run.start_date = NEW_COMBINED_FINAL_GRADES_DATE + timedelta(days=1)
            course_run.save()
            CombinedFinalGrade.objects.create(user=self.user, course=course, grade="80")
            assert mmtrack.get_overall_final_grade_for_course(course) == "80"

    def test_get_best_proctored_exam_grade(self):
        """
        Test get_best_proctorate_exam_grade to return a passed exam with the highest score
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        course = self.cruns[0].course
        last_week = now_in_utc() - timedelta(weeks=1)

        ProctoredExamGradeFactory.create(user=self.user, course=course, passed=False, percentage_grade=0.6)
        assert mmtrack.get_best_proctored_exam_grade(course) is None
        best_exam = ProctoredExamGradeFactory.create(
            user=self.user, course=course, passed=True, percentage_grade=0.9,
            exam_run__date_grades_available=last_week
        )
        assert mmtrack.get_best_proctored_exam_grade(course) == best_exam

        ProctoredExamGradeFactory.create(
            user=self.user, course=course, passed=True, percentage_grade=0.8,
            exam_run__date_grades_available=last_week
        )
        assert mmtrack.get_best_proctored_exam_grade(course) == best_exam

    @ddt.data(
        ["", "", False, False, False],
        ["", ExamProfile.PROFILE_ABSENT, True, False, False],
        [ExamProfile.PROFILE_INVALID, ExamProfile.PROFILE_SUCCESS, True, True, False],
        [ExamProfile.PROFILE_FAILED, ExamProfile.PROFILE_SUCCESS, True, True, False],
        ["", ExamProfile.PROFILE_SUCCESS, True, True, False],
        [ExamProfile.PROFILE_IN_PROGRESS, ExamProfile.PROFILE_SUCCESS, True, True, False],
        [ExamProfile.PROFILE_SUCCESS, ExamProfile.PROFILE_SUCCESS, True, True, False],
        [ExamProfile.PROFILE_SUCCESS, ExamProfile.PROFILE_SCHEDULABLE, True, True, True],
    )
    @ddt.unpack  # pylint: disable=too-many-arguments
    def test_get_exam_card_status_for_edx_exams(self, profile_status, expected_status, make_exam_run,
                                                make_profile, make_auth):
        """
        test get_exam_card_status
        """
        now = now_in_utc()
        exam_run = None
        if make_exam_run:
            exam_run = ExamRunFactory.create(
                course=self.course,
                date_first_eligible=now - timedelta(weeks=1),
                date_last_eligible=now + timedelta(weeks=1),
            )

        if make_profile:
            ExamProfileFactory.create(
                profile=self.user.profile,
                status=profile_status,
            )

        if make_auth:
            ExamAuthorizationFactory.create(
                user=self.user,
                status=ExamAuthorization.STATUS_SUCCESS,
                exam_run=exam_run,
            )

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        assert mmtrack.get_exam_card_status() == expected_status

    def test_get_exam_card_status_eligible(self):
        """
        test get_exam_card_status against valid eligibility dates
        """

        ExamProfileFactory.create(
            profile=self.user.profile,
            status=ExamProfile.PROFILE_SUCCESS,
        )

        now = datetime(2016, 3, 15, tzinfo=pytz.UTC)
        past = datetime(2016, 3, 10, tzinfo=pytz.UTC)
        future = datetime(2016, 3, 20, tzinfo=pytz.UTC)
        valid_dates = [
            past - timedelta(days=1),
            past,
            now,
            future,
        ]
        invalid_dates = [
            future + timedelta(days=1),
        ]

        ExamAuthorizationFactory.create(
            user=self.user,
            status=ExamAuthorization.STATUS_SUCCESS,
            exam_run__course=self.course,
            exam_run__date_first_eligible=past.date(),
            exam_run__date_last_eligible=future.date(),
        )

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        # should be considered schedulable if past <= datetime.now() <= future
        for now_value in valid_dates:
            mmtrack.now = now_value
            assert mmtrack.get_exam_card_status() == ExamProfile.PROFILE_SCHEDULABLE

        # not eligible
        for now_value in invalid_dates:
            mmtrack.now = now_value
            assert mmtrack.get_exam_card_status() == ExamProfile.PROFILE_SUCCESS


@ddt.ddt
class ConvertLetterGradeTests(MockedESTestCase):
    """Tests grade to letter conversion"""
    @ddt.data(
        (82.5, 'A'),
        (82.0, 'B'),
        (64.9, 'C'),
        (55, 'C'),
        (54.5, 'D'),
        (49.5, 'F'),
    )
    @ddt.unpack
    def test_convert_to_letter(self, grade, letter):
        """Test that convert_to_letter is correct"""
        assert convert_to_letter(grade) == letter
