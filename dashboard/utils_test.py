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
from dashboard.api_edx_cache import CachedEdxUserData
from dashboard.models import CachedEnrollment, CachedCertificate, CachedCurrentGrade
from dashboard.utils import get_mmtrack, MMTrack
from ecommerce.factories import LineFactory, OrderFactory
from ecommerce.models import Order
from exams.factories import ExamProfileFactory, ExamAuthorizationFactory, ExamRunFactory
from exams.models import ExamProfile, ExamAuthorization
from grades.factories import FinalGradeFactory
from grades.models import FinalGrade
from micromasters.factories import UserFactory
from micromasters.utils import (
    load_json_from_file,
    now_in_utc,
)
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
        cls.program = ProgramFactory.create(live=True, financial_aid_availability=False, price=1000)
        cls.program_financial_aid = ProgramFactory.create(live=True, financial_aid_availability=True, price=1000)

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

        # and the program with financial aid
        finaid_course = CourseFactory.create(program=cls.program_financial_aid)
        cls.now = now_in_utc()
        cls.end_date = cls.now - timedelta(weeks=45)
        cls.crun_fa = CourseRunFactory.create(
            course=finaid_course,
            start_date=cls.now-timedelta(weeks=52),
            end_date=cls.end_date,
            enrollment_start=cls.now-timedelta(weeks=62),
            enrollment_end=cls.now-timedelta(weeks=53),
            edx_course_key="course-v1:odl+FOO101+CR-FALL15"
        )
        CourseRunFactory.create(
            course=finaid_course,
            edx_course_key=None
        )

    def pay_for_fa_course(self, course_id):
        """
        Helper function to pay for a financial aid course
        """
        order = OrderFactory.create(
            user=self.user,
            status=Order.FULFILLED
        )
        return LineFactory.create(
            order=order,
            course_key=course_id
        )

    def test_init_normal_track(self):
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
        assert mmtrack.financial_aid_available == self.program.financial_aid_availability
        assert mmtrack.edx_course_keys == {
            "course-v1:edX+DemoX+Demo_Course",
            "course-v1:MITx+8.MechCX+2014_T1",
            "course-v1:odl+FOO102+CR-FALL16"
        }
        assert mmtrack.paid_course_keys == set()

    def test_init_financial_aid_track(self):
        """
        Test of the init of the class for programs with financial aid
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )

        assert mmtrack.user == self.user
        assert mmtrack.program == self.program_financial_aid
        assert mmtrack.enrollments == self.cached_edx_user_data.enrollments
        assert mmtrack.current_grades == self.cached_edx_user_data.current_grades
        assert mmtrack.certificates == self.cached_edx_user_data.certificates
        assert mmtrack.financial_aid_available == self.program_financial_aid.financial_aid_availability
        assert mmtrack.edx_course_keys == {"course-v1:odl+FOO101+CR-FALL15"}
        assert mmtrack.paid_course_keys == set()

    def test_fa_paid(self):
        """
        Test that for financial aid, mmtrack.paid_course_ids only apply to the user with a matching Order
        """
        key = "course-v1:odl+FOO101+CR-FALL15"
        self.pay_for_fa_course(key)

        mmtrack_paid = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack_paid.paid_course_keys == {key}

        mmtrack = MMTrack(
            user=UserFactory.create(),
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.paid_course_keys == set()

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

        # for financial aid program there is no difference
        mmtrack_fa = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack_fa.is_enrolled("course-v1:odl+FOO101+CR-FALL15") is True
        with patch('edx_api.enrollments.models.Enrollments.is_enrolled_in', return_value=False):
            assert mmtrack.is_enrolled("course-v1:odl+FOO101+CR-FALL15") is False

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

    def test_is_enrolled_mmtrack_fa(self):
        """
        Tests for the is_enrolled_mmtrack method in case financial aid is available
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"

        # before paying
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.is_enrolled_mmtrack(course_id) is False

        # after paying
        self.pay_for_fa_course(course_id)
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.is_enrolled_mmtrack(course_id) is True

    @ddt.data(True, False)
    def test_has_passed_course(self, final_grade_passed):
        """
        Test that has_passed_course returns True when a passed FinalGrade exists
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
        assert mmtrack.has_passed_course(final_grade.course_run.edx_course_key) is final_grade_passed

    def test_has_passed_course_no_grade(self):
        """
        Test that has_passed_course returns False when no FinalGrade exists
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_passed_course('random-course-id') is False

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

    @ddt.data(True, False)
    def test_has_paid_final_grade(self, has_paid):
        """
        Test that has_paid_final_grade returns True when the associated FinalGrade is paid
        """
        final_grade = FinalGradeFactory.create(
            user=self.user,
            course_run=self.cruns[0],
            course_run_paid_on_edx=has_paid
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_paid_final_grade(final_grade.course_run.edx_course_key) is has_paid

    def test_has_paid_final_grade_none(self):
        """
        Test that has_paid_final_grade returns False when a FinalGrade doesn't exist
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_paid_final_grade('random-course-id') is False

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
        with patch('edx_api.grades.models.CurrentGrades.get_current_grade', return_value=None):
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

    def test_count_courses_passed_fa(self):
        """
        Assert that count_courses_passed works in case of fa program.
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.count_courses_passed() == 0
        FinalGradeFactory.create(
            user=self.user,
            course_run=self.crun_fa,
            passed=True
        )
        assert mmtrack.count_courses_passed() == 1

    def test_has_paid_fa_no_final_grade(self):
        """
        Assert that has_paid works for FA programs in case there is no final grade
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        key = self.crun_fa.edx_course_key
        assert mmtrack.has_paid(key) is False

        self.pay_for_fa_course(key)
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_paid(key) is True

    def test_not_paid_fa_with_course_run_paid_on_edx(self):
        """
        Test for has_paid is False for FA programs even in case
        there is a final grade with course_run_paid_on_edx=True
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        key = self.crun_fa.edx_course_key
        assert mmtrack.has_paid(key) is False
        final_grade = FinalGradeFactory.create(user=self.user, course_run=self.crun_fa, course_run_paid_on_edx=True)
        assert mmtrack.has_paid(key) is False
        final_grade.course_run_paid_on_edx = False
        final_grade.save()
        assert mmtrack.has_paid(key) is False

    def test_has_paid_fa_with_course_run_paid_on_mm(self):
        """
        Test for has_paid is True for FA programs when the course has been paid on MicroMasters
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        key = self.crun_fa.edx_course_key
        assert mmtrack.has_paid(key) is False

        self.pay_for_fa_course(key)
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_paid(key) is True

    def test_has_paid_not_fa_no_final_grade(self):
        """
        Assert that has_paid works for non-FA programs in case there is no final grade
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        key = "course-v1:edX+DemoX+Demo_Course"
        assert mmtrack.has_paid(key) is True

    def test_has_paid_not_fa_with_final_grade(self):
        """
        Assert that has_paid works for non-FA programs in case there is a final grade
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        key = "course-v1:odl+FOO102+CR-FALL16"
        assert mmtrack.has_paid(key) is False
        course_run = self.cruns[-1]
        final_grade = FinalGradeFactory.create(user=self.user, course_run=course_run, course_run_paid_on_edx=True)
        assert mmtrack.has_paid(key) is True
        final_grade.course_run_paid_on_edx = False
        final_grade.save()
        assert mmtrack.has_paid(key) is False

    def test_has_paid_for_any_in_program(self):
        """
        Assert that has_paid_for_any_in_program returns True if any CourseRun associated with a Program has been
        paid for.
        """
        new_program = ProgramFactory.create()
        new_course_runs = CourseRunFactory.create_batch(2, course__program=new_program)
        mmtrack = MMTrack(
            user=self.user,
            program=new_program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_paid_for_any_in_program() is False
        fg = FinalGradeFactory.create(user=self.user, course_run=new_course_runs[0], course_run_paid_on_edx=True)
        assert mmtrack.has_paid_for_any_in_program() is True
        fg.delete()
        FinalGradeFactory.create(user=self.user, course_run=new_course_runs[1], course_run_paid_on_edx=True)
        assert mmtrack.has_paid_for_any_in_program() is True

    @ddt.data(
        ("verified", "downloadable", True),
        ("audit", "downloadable", False),
        ("verified", "generating", False),
        ("verified", "notpassing", False),
        ("verified", "unverified", False),
    )
    @ddt.unpack
    def test_has_passing_certificate(self, certificate_type, status, expected_result):
        """
        Test for has_passing_certificate method with different type of certificates
        """
        course_key = self.crun_fa.edx_course_key
        cert_json = {
            "username": "staff",
            "course_id": course_key,
            "certificate_type": certificate_type,
            "status": status,
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
            program=self.program_financial_aid,
            edx_user_data=cached_edx_user_data
        )
        assert mmtrack.has_passing_certificate(course_key) is expected_result

    def test_has_passing_certificate_fa(self):
        """
        Assert that has_passing_certificate is true if user has a cert even if has_paid is false for FA programs
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        key = self.crun_fa.edx_course_key
        assert mmtrack.has_passing_certificate(key) is False
        assert mmtrack.has_paid(key) is False

        cert_json = {
            "username": "staff",
            "course_id": self.crun_fa.edx_course_key,
            "certificate_type": "verified",
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
            program=self.program_financial_aid,
            edx_user_data=cached_edx_user_data
        )
        assert mmtrack.has_passing_certificate(key) is True
        assert mmtrack.has_paid(key) is False

    def test_get_mmtrack(self):
        """
        test creation of  mmtrack(dashboard.utils.MMTrack) object.
        """
        self.pay_for_fa_course(self.crun_fa.edx_course_key)
        mmtrack = get_mmtrack(self.user, self.program_financial_aid)
        key = self.crun_fa.edx_course_key
        assert mmtrack.user == self.user
        assert mmtrack.has_paid(key) is True

    @ddt.data(
        ["", "", False, False, False, False],
        ["", ExamProfile.PROFILE_ABSENT, True, False, False, False],
        [ExamProfile.PROFILE_INVALID, ExamProfile.PROFILE_INVALID, True, True, False, False],
        [ExamProfile.PROFILE_FAILED, ExamProfile.PROFILE_INVALID, True, True, False, False],
        ["", ExamProfile.PROFILE_INVALID, True, True, False, True],
        [ExamProfile.PROFILE_PENDING, ExamProfile.PROFILE_IN_PROGRESS, True, True, False, False],
        [ExamProfile.PROFILE_IN_PROGRESS, ExamProfile.PROFILE_IN_PROGRESS, True, True, False, False],
        [ExamProfile.PROFILE_SUCCESS, ExamProfile.PROFILE_SUCCESS, True, True, False, False],
        [ExamProfile.PROFILE_SUCCESS, ExamProfile.PROFILE_SCHEDULABLE, True, True, True, False],
    )
    @ddt.unpack  # pylint: disable=too-many-arguments
    @patch('dashboard.utils.log')
    def test_get_pearson_exam_status(self, profile_status, expected_status, make_exam_run,
                                     make_profile, make_auth, log_error_called, log_mock):
        """
        test get_pearson_exam_status
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

        assert mmtrack.get_pearson_exam_status() == expected_status
        assert log_mock.error.called is log_error_called

    def test_get_pearson_exam_status_eligible(self):
        """
        test get_pearson_exam_status against valid eligibility dates
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
            assert mmtrack.get_pearson_exam_status() == ExamProfile.PROFILE_SCHEDULABLE

        # not eligible
        for now_value in invalid_dates:
            mmtrack.now = now_value
            assert mmtrack.get_pearson_exam_status() == ExamProfile.PROFILE_SUCCESS
