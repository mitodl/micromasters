"""
Tests for the utils module
"""
from datetime import datetime, timedelta
from unittest.mock import (
    patch,
    MagicMock,
    Mock,
)

import pytz
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
import ddt

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from dashboard.api_edx_cache import CachedEdxUserData
from dashboard.models import CachedEnrollment, CachedCertificate, CachedCurrentGrade
from dashboard.utils import get_mmtrack, MMTrack
from ecommerce.factories import CoursePriceFactory, LineFactory, OrderFactory
from ecommerce.models import Order
from exams.factories import ExamProfileFactory, ExamAuthorizationFactory
from exams.models import ExamProfile, ExamAuthorization
from financialaid.constants import FinancialAidStatus
from financialaid.factories import TierProgramFactory, FinancialAidFactory
from grades.constants import FinalGradeStatus
from grades.factories import FinalGradeFactory
from grades.models import FinalGrade
from micromasters.factories import UserFactory
from micromasters.utils import load_json_from_file
from search.base import MockedESTestCase


# pylint: disable=too-many-arguments


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
        cls.program = ProgramFactory.create(live=True, financial_aid_availability=False)
        cls.program_financial_aid = ProgramFactory.create(live=True, financial_aid_availability=True)

        # create course runs for the normal program
        course = CourseFactory.create(program=cls.program)
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
                course=course,
                edx_course_key=course_key
            )
            if course_key:
                cls.cruns.append(course_run)
        # and the program with financial aid
        finaid_course = CourseFactory.create(program=cls.program_financial_aid)
        cls.now = datetime.now(pytz.utc)
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

        # create price for the financial aid course
        CoursePriceFactory.create(
            course_run=cls.crun_fa,
            is_valid=True,
            price=1000
        )
        cls.min_tier_program = TierProgramFactory.create(
            program=cls.program_financial_aid,
            discount_amount=750,
            current=True
        )
        cls.max_tier_program = TierProgramFactory.create(
            program=cls.program_financial_aid,
            discount_amount=0,
            current=True
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
        assert mmtrack.course_ids == {
            "course-v1:edX+DemoX+Demo_Course",
            "course-v1:MITx+8.MechCX+2014_T1",
            "course-v1:odl+FOO102+CR-FALL16"
        }
        assert mmtrack.paid_course_ids == set()
        assert mmtrack.financial_aid_applied is None
        assert mmtrack.financial_aid_status is None
        assert mmtrack.financial_aid_id is None
        assert mmtrack.financial_aid_min_price is None
        assert mmtrack.financial_aid_max_price is None
        assert mmtrack.financial_aid_date_documents_sent is None

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
        assert mmtrack.course_ids == {"course-v1:odl+FOO101+CR-FALL15"}
        assert mmtrack.paid_course_ids == set()
        assert mmtrack.financial_aid_applied is False
        assert mmtrack.financial_aid_status is None
        assert mmtrack.financial_aid_id is None
        assert mmtrack.financial_aid_min_price == 250
        assert mmtrack.financial_aid_max_price == 1000
        assert mmtrack.financial_aid_date_documents_sent is None

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
        assert mmtrack_paid.paid_course_ids == {key}

        mmtrack = MMTrack(
            user=UserFactory.create(),
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.paid_course_ids == set()

    def test_init_financial_aid_with_application(self):
        """
        Sub case of test_init_financial_aid_track where there is a financial aid application for the user
        """
        # create a financial aid application
        fin_aid = FinancialAidFactory.create(
            user=self.user,
            tier_program=self.min_tier_program,
            date_documents_sent=None,
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )

        assert mmtrack.financial_aid_applied is True
        assert mmtrack.financial_aid_status == fin_aid.status
        assert mmtrack.financial_aid_id == fin_aid.id
        assert mmtrack.financial_aid_min_price == 250
        assert mmtrack.financial_aid_max_price == 1000
        assert mmtrack.financial_aid_date_documents_sent is None

    def test_init_financial_aid_with_application_in_reset(self):
        """
        Sub case of test_init_financial_aid_with_application where
        there is a financial aid application for the user but the state is `reset`
        """
        FinancialAidFactory.create(
            user=self.user,
            tier_program=self.min_tier_program,
            date_documents_sent=None,
            status=FinancialAidStatus.RESET
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        # the result is like if the user never applied
        assert mmtrack.financial_aid_applied is False
        assert mmtrack.financial_aid_status is None
        assert mmtrack.financial_aid_id is None
        assert mmtrack.financial_aid_min_price == 250
        assert mmtrack.financial_aid_max_price == 1000
        assert mmtrack.financial_aid_date_documents_sent is None

    def test_init_financial_aid_with_documents_sent(self):
        """
        Sub case of test_init_financial_aid_with_application
        where the user set a date for the financial aid documents sent
        """
        # create a financial aid application
        fin_aid = FinancialAidFactory.create(
            user=self.user,
            tier_program=self.min_tier_program,
            date_documents_sent=self.now,
        )
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )

        assert mmtrack.financial_aid_applied is True
        assert mmtrack.financial_aid_status == fin_aid.status
        assert mmtrack.financial_aid_id == fin_aid.id
        assert mmtrack.financial_aid_min_price == 250
        assert mmtrack.financial_aid_max_price == 1000
        assert mmtrack.financial_aid_date_documents_sent == self.now.date()

    def test_course_price_mandatory(self):
        """
        Test that if financial aid is available for the program, at least one course price should be available.
        """
        program = ProgramFactory.create(live=True, financial_aid_availability=True)
        TierProgramFactory.create(
            program=program,
            discount_amount=750,
            current=True
        )
        with self.assertRaises(ImproperlyConfigured):
            MMTrack(
                user=self.user,
                program=program,
                edx_user_data=self.cached_edx_user_data
            )

    def test_course_tier_mandatory(self):
        """
        Test that if financial aid is available for the program, at least one tier should be available.
        """
        program = ProgramFactory.create(live=True, financial_aid_availability=True)
        course = CourseFactory.create(program=program)
        crun_fa = CourseRunFactory.create(course=course)
        CoursePriceFactory.create(
            course_run=crun_fa,
            is_valid=True,
            price=1000
        )
        with self.assertRaises(ImproperlyConfigured):
            MMTrack(
                user=self.user,
                program=program,
                edx_user_data=self.cached_edx_user_data
            )

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

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v1"})
    @patch('dashboard.utils.MMTrack.extract_final_grade', autospec=True)
    def test_has_passed_course(self, extr_grade_mock):
        """
        Test for has_passed_course method.
        V1 new behavior soon to be default
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        grade_mock = Mock(passed=True)
        extr_grade_mock.return_value = grade_mock

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        assert mmtrack.has_passed_course(course_id) is True
        extr_grade_mock.assert_called_once_with(mmtrack, course_id)

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v1"})
    @patch('dashboard.utils.MMTrack.extract_final_grade', autospec=True)
    def test_has_passed_course_raises(self, extr_grade_mock):
        """
        Test for has_passed_course method in case the called function raises.
        V1 new behavior soon to be default
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        grade_mock = Mock(passed=True)
        extr_grade_mock.return_value = grade_mock

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        extr_grade_mock.side_effect = FinalGrade.DoesNotExist
        with self.assertRaises(FinalGrade.DoesNotExist):
            mmtrack.has_passed_course(course_id)
        extr_grade_mock.assert_called_once_with(mmtrack, course_id)

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v1"})
    @patch('dashboard.utils.MMTrack.extract_final_grade', autospec=True)
    def test_get_final_grade(self, extr_grade_mock):
        """
        Test for has_passed_course method.
        V1 new behavior soon to be default
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        grade_mock = Mock(grade=0.57)
        extr_grade_mock.return_value = grade_mock

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        # calling round here because we do not want to add it in `get_final_grade` and let the frontend handle it
        assert round(mmtrack.get_final_grade(course_id)) == 57.0
        extr_grade_mock.assert_called_once_with(mmtrack, course_id)

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v1"})
    @patch('dashboard.utils.MMTrack.extract_final_grade', autospec=True)
    def test_get_final_grade_raises(self, extr_grade_mock):
        """
        Test for has_passed_course method in case the called function raises.
        V1 new behavior soon to be default
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        grade_mock = Mock(grade=0.57)
        extr_grade_mock.return_value = grade_mock

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        extr_grade_mock.side_effect = FinalGrade.DoesNotExist
        with self.assertRaises(FinalGrade.DoesNotExist):
            mmtrack.has_passed_course(course_id)
        extr_grade_mock.assert_called_once_with(mmtrack, course_id)

    @patch('grades.models.FinalGrade.objects.get', autospec=True)
    @ddt.data(
        (True, False),
        (False, True),
    )
    @ddt.unpack
    def test_has_frozen_grade(self, get_frozen_raises, expected_result, get_grades_mock):
        """
        Test for has_frozen_grade method.
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        if not get_frozen_raises:
            grade_mock = Mock(grade=0.97, passed=True)
            get_grades_mock.return_value = grade_mock
        else:
            get_grades_mock.side_effect = FinalGrade.DoesNotExist

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_frozen_grade(course_id) is expected_result

    @patch('dashboard.utils.MMTrack.has_paid', autospec=True)
    @patch('grades.models.FinalGrade.objects.get', autospec=True)
    @ddt.data(
        (True, True, False),
        (True, False, False),
        (False, True, True),
        (False, False, False),
    )
    @ddt.unpack
    def test_has_paid_frozen_grade(
            self, get_frozen_raises, has_paid, expected_result,
            get_grades_mock, has_paid_mock):
        """
        Test for extract_final_grade method.
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        if not get_frozen_raises:
            grade_mock = Mock(grade=0.97, passed=True)
            get_grades_mock.return_value = grade_mock
        else:
            get_grades_mock.side_effect = FinalGrade.DoesNotExist
        has_paid_mock.return_value = has_paid

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_paid_frozen_grade(course_id) is expected_result

    @patch('grades.models.FinalGrade.objects.get', autospec=True)
    def test_extract_final_grade(self, get_grades_mock):
        """
        Test for extract_final_grade method.
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        grade_mock = Mock(grade=0.97, passed=True)
        get_grades_mock.return_value = grade_mock

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        res = mmtrack.extract_final_grade(course_id)
        assert res.grade == 0.97
        assert res.passed is True
        get_grades_mock.assert_called_once_with(
            course_run__edx_course_key=course_id,
            status=FinalGradeStatus.COMPLETE,
            user=self.user
        )

    @patch('grades.models.FinalGrade.objects.get', autospec=True)
    def test_extract_final_grade_raises(self, get_grades_mock):
        """
        Test for extract_final_grade method in case the called model raises.
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        grade_mock = Mock(grade=0.97, passed=True)
        get_grades_mock.return_value = grade_mock

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        # it raises if the FinalGrade model raises
        get_grades_mock.side_effect = FinalGrade.DoesNotExist
        mmtrack.final_grades = {}
        with self.assertRaises(FinalGrade.DoesNotExist):
            mmtrack.extract_final_grade(course_id)
        get_grades_mock.assert_called_once_with(
            course_run__edx_course_key=course_id,
            status=FinalGradeStatus.COMPLETE,
            user=self.user
        )

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
    def test_has_passed_course_normal_v0(self):
        """
        Test for has_passed_course method in case of a normal program
        V0 default behavior soon to be deprecated
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        # this is a verified enrollment and a verified certificate from edx
        assert mmtrack.has_passed_course("course-v1:edX+DemoX+Demo_Course") is True
        # this is a audit enrollment and a non verified certificate from edx
        assert mmtrack.has_passed_course("course-v1:MITx+8.MechCX+2014_T1") is False

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
    def test_has_passed_course_fa_v0(self):
        """
        Test for has_passed_course method in case of a financial aid program
        V0 default behavior soon to be deprecated
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        self.pay_for_fa_course(course_id)
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.has_passed_course(course_id) is True

        # in case there is no current grade for the run
        with patch('edx_api.grades.models.CurrentGrades.get_current_grade', return_value=None):
            assert mmtrack.has_passed_course(course_id) is False

        # move the end date in the future
        self.crun_fa.end_date = datetime.now(pytz.utc) + timedelta(weeks=1)
        self.crun_fa.save()
        assert mmtrack.has_passed_course(course_id) is False

        # remove the end date
        self.crun_fa.end_date = None
        self.crun_fa.save()
        with self.assertRaises(ImproperlyConfigured):
            mmtrack.has_passed_course(course_id)

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
    def test_get_final_grade_normal_v0(self):
        """
        Test for get_final_grade method in case of a normal program
        V0 default behavior soon to be deprecated
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        # this is a verified enrollment and a verified certificate from edx
        assert mmtrack.get_final_grade("course-v1:edX+DemoX+Demo_Course") == 98.0
        # this is a audit enrollment and a non verified certificate from edx
        assert mmtrack.get_final_grade("course-v1:MITx+8.MechCX+2014_T1") is None

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
    def test_get_final_grade_fa_v0(self):
        """
        Test for get_final_grade method in case of a financial aid program
        V0 default behavior soon to be deprecated
        """
        course_id = "course-v1:odl+FOO101+CR-FALL15"
        self.pay_for_fa_course(course_id)
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.get_final_grade(course_id) == 69.0
        assert mmtrack.get_final_grade("course-v1:edX+DemoX+Demo_Course") is None

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
    def test_get_all_final_grades(self):
        """
        Test for get_all_final_grades
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.get_all_final_grades() == {'course-v1:edX+DemoX+Demo_Course': 98.0}

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

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
    def test_count_courses_passed_normal_v0(self):
        """
        Assert that count_courses_passed works in case of a normal program.
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.count_courses_passed() == 1

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
    def test_count_courses_passed_fa_v0(self):
        """
        Assert that count_courses_passed works in case of fa program.
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.count_courses_passed() == 0

        self.pay_for_fa_course(self.crun_fa.edx_course_key)
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        assert mmtrack.count_courses_passed() == 1

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v1"})
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

    @override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v1"})
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

    def test_has_paid_fa(self):
        """
        Assert that has_paid works for FA programs
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

    def test_has_paid_not_fa(self):
        """
        Assert that has_paid works for non-FA programs
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )
        key = "course-v1:edX+DemoX+Demo_Course"
        assert mmtrack.has_paid(key) is True

    def test_has_verified_cert_fa(self):
        """
        Assert that has_cert_fa is true if user has a cert even if has_paid is false for FA programs
        """
        mmtrack = MMTrack(
            user=self.user,
            program=self.program_financial_aid,
            edx_user_data=self.cached_edx_user_data
        )
        key = self.crun_fa.edx_course_key
        assert mmtrack.has_verified_cert(key) is False
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
        assert mmtrack.has_verified_cert(key) is True
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
        ["", "", False, False, False],
        ["", ExamProfile.PROFILE_ABSENT, True, False, False],
        [ExamProfile.PROFILE_INVALID, ExamProfile.PROFILE_INVALID, True, True, False],
        [ExamProfile.PROFILE_FAILED, ExamProfile.PROFILE_INVALID, True, True, False],
        ["", ExamProfile.PROFILE_INVALID, True, True, False],
        [ExamProfile.PROFILE_PENDING, ExamProfile.PROFILE_IN_PROGRESS, True, True, False],
        [ExamProfile.PROFILE_IN_PROGRESS, ExamProfile.PROFILE_IN_PROGRESS, True, True, False],
        [ExamProfile.PROFILE_SUCCESS, ExamProfile.PROFILE_SUCCESS, True, True, False],
        [ExamProfile.PROFILE_SUCCESS, ExamProfile.PROFILE_SCHEDULABLE, True, True, True],
    )
    @ddt.unpack  # pylint: disable=too-many-arguments
    def test_get_pearson_exam_status(self, profile_status, expected_status, set_series_code, make_profile, make_auth):
        """
        test get_pearson_exam_status
        """

        if not set_series_code:
            exam_series_code = self.program.exam_series_code
            self.program.exam_series_code = None
            self.program.save()

        if make_profile:
            ExamProfileFactory.create(
                profile=self.user.profile,
                status=profile_status,
            )

        if make_auth:
            now = datetime.now(pytz.utc)
            ExamAuthorizationFactory.create(
                user=self.user,
                status=ExamAuthorization.STATUS_SUCCESS,
                date_last_eligible=now + timedelta(weeks=1),
                date_first_eligible=now - timedelta(weeks=1),
            )

        mmtrack = MMTrack(
            user=self.user,
            program=self.program,
            edx_user_data=self.cached_edx_user_data
        )

        assert mmtrack.get_pearson_exam_status() == expected_status

        if not set_series_code:
            self.program.exam_series_code = exam_series_code
