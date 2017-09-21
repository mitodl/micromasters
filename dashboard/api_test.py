"""
Tests for the dashboard api functions
"""
from datetime import timedelta
from unittest.mock import (
    MagicMock,
    Mock,
    PropertyMock,
    patch,
)

import ddt
from django.core.exceptions import ImproperlyConfigured
from django.conf import settings
from rest_framework import status as http_status

from backends.exceptions import InvalidCredentialStored
from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
    FullProgramFactory,
)
from dashboard import (
    api,
    models,
)
from dashboard.api_edx_cache import CachedEdxDataApi
from dashboard.factories import CachedEnrollmentFactory, CachedCurrentGradeFactory, UserCacheRefreshTimeFactory
from dashboard.models import CachedCertificate
from dashboard.utils import MMTrack
from exams.models import ExamProfile
from exams.factories import ExamRunFactory, ExamAuthorizationFactory
from grades.constants import FinalGradeStatus
from grades.exceptions import FreezeGradeFailedException
from grades.factories import ProctoredExamGradeFactory, FinalGradeFactory, MicromastersCourseCertificateFactory
from grades.models import FinalGrade, CourseRunGradingStatus, ProctoredExamGrade
from grades.serializers import ProctoredExamGradeSerializer
from micromasters.factories import UserFactory
from micromasters.utils import (
    is_subset_dict,
    now_in_utc,
)
from search.base import MockedESTestCase


# pylint: disable=too-many-lines, too-many-arguments
class StatusTest(MockedESTestCase):
    """
    Tests for the different status classes
    """
    def test_course_status(self):
        """test for CourseStatus"""
        for attr in ('PASSED', 'NOT_PASSED', 'CURRENTLY_ENROLLED',
                     'CAN_UPGRADE', 'OFFERED', 'WILL_ATTEND', ):
            assert hasattr(api.CourseStatus, attr)

    def test_course_status_all_statuses(self):
        """test for CourseStatus.all_statuses"""
        all_constants = [value for name, value in vars(api.CourseStatus).items()
                         if not name.startswith('_') and isinstance(value, str)]
        assert sorted(all_constants) == sorted(api.CourseStatus.all_statuses())

    def test_course_run_status(self):
        """test for CourseRunStatus"""
        for attr in ('NOT_ENROLLED', 'CURRENTLY_ENROLLED', 'CHECK_IF_PASSED',
                     'WILL_ATTEND', 'CAN_UPGRADE', 'NOT_PASSED'):
            assert hasattr(api.CourseRunStatus, attr)

    def test_course_run_user_status(self):
        """test for CourseRunUserStatus"""
        ustat = api.CourseRunUserStatus(
            status='status',
            course_run='run',
        )
        assert ustat.status == 'status'
        assert ustat.course_run == 'run'

    def test_course_run_user_status_repr(self):
        """test for CourseRunUserStatus __repr__"""
        mock_run = MagicMock()
        mock_run.title = 'run'
        ustat = api.CourseRunUserStatus(
            status='status',
            course_run=mock_run,
        )
        reps_str_start = '<CourseRunUserStatus for course {course} status {status} at '.format(
            course=ustat.course_run.title,
            status=ustat.status
        )
        obj_repr = repr(ustat)
        assert obj_repr.startswith(reps_str_start)

    def test_course_format_conditional_fields_struct(self):
        """
        test for CourseFormatConditionalFields:
        checking the association has the right structure and key/value pairs
        """
        assert isinstance(api.CourseFormatConditionalFields.ASSOCIATED_FIELDS, dict)
        for key in api.CourseFormatConditionalFields.ASSOCIATED_FIELDS:
            assert key in api.CourseStatus.all_statuses()
            assert isinstance(api.CourseFormatConditionalFields.ASSOCIATED_FIELDS[key], list)
            for assoc in api.CourseFormatConditionalFields.ASSOCIATED_FIELDS[key]:
                assert isinstance(assoc, dict)
                assert 'course_run_field' in assoc
                assert 'format_field' in assoc
                assert assoc['course_run_field'] not in ['', None]
                assert assoc['format_field'] not in ['', None]

    def test_course_format_conditional_fields_get(self):
        """test for CourseFormatConditionalFields.get_assoc_field"""
        with self.assertRaises(ImproperlyConfigured):
            api.CourseFormatConditionalFields.get_assoc_field('foobar')
        assert len(api.CourseFormatConditionalFields.get_assoc_field(api.CourseStatus.OFFERED)) == 2


class CourseTests(MockedESTestCase):
    """Base class for APIs tests"""

    @classmethod
    def setUpTestData(cls):
        super(CourseTests, cls).setUpTestData()
        cls.course = CourseFactory.create(title="Title")
        cls.user = UserFactory.create()

    def setUp(self):
        super(CourseTests, self).setUp()
        self.now = now_in_utc()
        self.mmtrack = MagicMock(wraps=MMTrack)

    def create_run(self, course=None, start=None, end=None,
                   enr_start=None, enr_end=None, edx_key=None, title="Title",
                   upgrade_deadline=None):
        """helper function to create course runs"""
        # pylint: disable=too-many-arguments
        run = CourseRunFactory.create(
            course=course or self.course,
            title=title,
            start_date=start,
            end_date=end,
            enrollment_start=enr_start,
            enrollment_end=enr_end,
            upgrade_deadline=upgrade_deadline,
        )
        if edx_key is not None:
            run.edx_course_key = edx_key
            run.save()
        return run


class FormatRunTest(CourseTests):
    """Tests for the format_courserun_for_dashboard function"""

    def setUp(self):
        super().setUp()
        self.mmtrack.configure_mock(**{
            'get_final_grade_percent.return_value': 99.99,
            'get_current_grade.return_value': 33.33,
            'has_paid.return_value': False,
            'has_final_grade.return_value': False
        })
        self.crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            upgrade_deadline=self.now+timedelta(weeks=70),
        )
        self.expected_ret_data = {
            'title': self.crun.title,
            'status': api.CourseStatus.PASSED,
            'id': self.crun.pk,
            'course_id': self.crun.edx_course_key,
            'position': 1,
            'course_start_date': self.crun.start_date,
            'course_end_date': self.crun.end_date,
            'fuzzy_start_date': self.crun.fuzzy_start_date,
            'final_grade': 99.99,
            'enrollment_url': self.crun.enrollment_url,
            'has_paid': False,
        }

    def test_format_run_no_run(self):
        """Test for format_courserun_for_dashboard if there is no run"""
        self.assertIsNone(
            api.format_courserun_for_dashboard(None, api.CourseStatus.PASSED, self.mmtrack)
        )

    def test_format_run_normal(self):
        """
        Test for format_courserun_for_dashboard
        """
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.PASSED, self.mmtrack),
            self.expected_ret_data
        )

    def test_format_run_different_position(self):
        """
        Test for format_courserun_for_dashboard with different position
        """
        self.expected_ret_data['position'] = 56
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.PASSED, self.mmtrack, position=56),
            self.expected_ret_data
        )

    def test_format_run_with_not_passed(self):
        """
        Test for format_courserun_for_dashboard with not passed
        """
        self.expected_ret_data.update({
            'status': api.CourseStatus.NOT_PASSED,
        })
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.NOT_PASSED, self.mmtrack),
            self.expected_ret_data
        )

    def test_format_run_with_currently_enrolled(self):
        """
        Test for format_courserun_for_dashboard with currently enrolled
        """
        self.expected_ret_data.update({
            'status': api.CourseStatus.CURRENTLY_ENROLLED,
            'current_grade': 33.33
        })
        del self.expected_ret_data['final_grade']
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.CURRENTLY_ENROLLED, self.mmtrack),
            self.expected_ret_data
        )

    def test_format_run_with_paid_course_run(self):
        """
        Test for format_courserun_for_dashboard with a paid course run
        """
        self.mmtrack.configure_mock(**{
            'has_paid.return_value': True
        })
        del self.expected_ret_data['final_grade']
        self.expected_ret_data.update({
            'status': api.CourseStatus.CURRENTLY_ENROLLED,
            'current_grade': 33.33,
            'has_paid': True,
        })
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.CURRENTLY_ENROLLED, self.mmtrack),
            self.expected_ret_data
        )

    def test_format_run_with_can_upgrade_no_frozen_grade(self):
        """
        Test for format_courserun_for_dashboard with can-upgrade status and no frozen grade
        """
        self.mmtrack.configure_mock(**{
            'has_final_grade.return_value': False,
        })
        del self.expected_ret_data['final_grade']
        self.expected_ret_data.update({
            'status': api.CourseStatus.CAN_UPGRADE,
            'current_grade': 33.33,
            'course_upgrade_deadline': self.crun.upgrade_deadline,
        })
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.CAN_UPGRADE, self.mmtrack),
            self.expected_ret_data
        )

    def test_format_run_with_can_upgrade_and_frozen_grade(self):
        """
        Test for format_courserun_for_dashboard with can-upgrade status and frozen grade
        """
        self.mmtrack.configure_mock(**{
            'has_final_grade.return_value': True,
        })
        self.expected_ret_data.update({
            'status': api.CourseStatus.CAN_UPGRADE,
            'course_upgrade_deadline': self.crun.upgrade_deadline,
        })
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.CAN_UPGRADE, self.mmtrack),
            self.expected_ret_data
        )

    def test_format_run_conditional(self):
        """Test for format_courserun_for_dashboard with conditional fields"""
        self.mmtrack.configure_mock(**{
            'has_paid.return_value': False
        })
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )
        self.assertEqual(
            api.format_courserun_for_dashboard(crun, api.CourseStatus.OFFERED, self.mmtrack),
            {
                'title': crun.title,
                'status': api.CourseStatus.OFFERED,
                'id': crun.pk,
                'course_id': crun.edx_course_key,
                'enrollment_start_date': crun.enrollment_start,
                'fuzzy_enrollment_start_date': crun.fuzzy_enrollment_start_date,
                'position': 1,
                'course_start_date': crun.start_date,
                'course_end_date': crun.end_date,
                'fuzzy_start_date': crun.fuzzy_start_date,
                'enrollment_url': crun.enrollment_url,
                'has_paid': False,
            }
        )

        # test that a weird status raises here
        with self.assertRaises(ImproperlyConfigured):
            api.format_courserun_for_dashboard(crun, 'foo_status', self.mmtrack)

    def test_has_final_grade_not_enrolled(self):
        """
        Test a special case where user has a final grade and he missed the
        deadline and neither he is enrolled in course nor he has paid
        """
        self.mmtrack.configure_mock(**{
            'get_final_grade_percent.return_value': 99.99,
            'has_paid.return_value': False,
            'has_final_grade.return_value': True
        })
        self.expected_ret_data.update({
            'status': api.CourseStatus.MISSED_DEADLINE,
            'final_grade': 99.99
        })
        self.assertEqual(
            api.format_courserun_for_dashboard(self.crun, api.CourseStatus.MISSED_DEADLINE, self.mmtrack),
            self.expected_ret_data
        )


@ddt.ddt
class CourseRunTest(CourseTests):
    """Tests for get_status_for_courserun"""

    @classmethod
    def setUpTestData(cls):
        super(CourseRunTest, cls).setUpTestData()
        cls.now = now_in_utc()

    def test_status_for_run_not_enrolled(self):
        """test for get_status_for_courserun for course without enrollment"""
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': False,
            'has_paid.return_value': False,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            edx_key='foo_edx_key'
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert isinstance(run_status, api.CourseRunUserStatus)
        assert run_status.status == api.CourseRunStatus.NOT_ENROLLED
        assert run_status.course_run == crun

    def test_currently_mmtrack_enrolled(self):
        """test for get_status_for_courserun for an enrolled and paid current course"""
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': True,
            'has_paid.return_value': True,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        # create a run that is current
        crun = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CURRENTLY_ENROLLED
        assert run_status.course_run == crun

    @patch('courses.models.CourseRun.is_upgradable', new_callable=PropertyMock)
    @ddt.data(
        (True, False, None, api.CourseRunStatus.CHECK_IF_PASSED),
        (False, True, True, api.CourseRunStatus.CAN_UPGRADE),
        (False, True, False, api.CourseRunStatus.MISSED_DEADLINE),
    )
    @ddt.unpack
    def test_has_final_grade_taken_before_anything_else(
            self, has_paid_froz, has_frozen, is_upgradable, status, mock_is_upgradable):
        """
        Tests that if an user has a final grade for the course,
        that is taken in account before checking anything else
        """
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'has_paid_final_grade.return_value': has_paid_froz,
            'has_final_grade.return_value': has_frozen,
        })
        mock_is_upgradable.return_value = is_upgradable
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == status
        assert run_status.course_run == crun
        assert self.mmtrack.is_enrolled.call_count == 0

    @ddt.data(
        (True, api.CourseRunStatus.CHECK_IF_PASSED),
        (False, api.CourseRunStatus.CURRENTLY_ENROLLED)
    )
    @ddt.unpack
    def test_status_with_frozen_grade(self, has_final_grades, expected_status):
        """
        test for get_status_for_courserun for a finished course if enrolled
        and in case the user has a final grade
        """
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': True,
            'has_paid.return_value': True,
            'has_paid_final_grade.return_value': has_final_grades,
            'has_final_grade.return_value': has_final_grades,
        })
        if not has_final_grades:
            self.mmtrack.get_final_grade.return_value = None
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        with patch(
            'courses.models.CourseRun.has_frozen_grades',
            new_callable=PropertyMock
        ) as frozen_mock:
            frozen_mock.return_value = has_final_grades
            run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == expected_status
        assert run_status.course_run == crun

    @patch('grades.api.freeze_user_final_grade', autospec=True)
    @patch('courses.models.CourseRun.has_frozen_grades', new_callable=PropertyMock)
    def test_check_if_passed_if_no_frozen_grade(self, has_frozen_mock, freeze_grades_mock):
        """
        test for get_status_for_courserun for a finished course if enrolled
        and in case the user has not a final grade
        """
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': True,
            'has_paid.return_value': True,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        has_frozen_mock.return_value = True
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        # in case the sync freeze works
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CHECK_IF_PASSED
        assert run_status.course_run == crun
        # if the sync freeze function raises, the tested function raises
        freeze_grades_mock.side_effect = FreezeGradeFailedException
        with self.assertRaises(FreezeGradeFailedException):
            api.get_status_for_courserun(crun, self.mmtrack)

    def test_read_will_attend(self):
        """test for get_status_for_courserun for an enrolled and paid future course"""
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': True,
            'has_paid.return_value': True,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        # create a run that is future
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.WILL_ATTEND
        assert run_status.course_run == crun

    def test_enrolled_not_paid_course(self):
        """test for get_status_for_courserun for present and future course with audit enrollment"""
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': False,
            'has_paid.return_value': False,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        # create a run that is future
        future_run = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        # create a run that is current
        current_run = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
            edx_key="course-v1:MITx+8.MechCX+2014_T2"
        )
        run_status = api.get_status_for_courserun(future_run, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CAN_UPGRADE
        assert run_status.course_run == future_run
        run_status = api.get_status_for_courserun(current_run, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CAN_UPGRADE
        assert run_status.course_run == current_run

    def test_enrolled_upgradable(self):
        """test for get_status_for_courserun with check if course can be upgraded to paid"""
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': False,
            'has_paid.return_value': False,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        # create a run that is current with upgrade deadline None
        current_run = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
            upgrade_deadline=None,
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        run_status = api.get_status_for_courserun(current_run, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CAN_UPGRADE

        # modify the run to have an upgrade deadline in the future
        current_run.upgrade_deadline = self.now+timedelta(weeks=1)
        current_run.save()
        run_status = api.get_status_for_courserun(current_run, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CAN_UPGRADE

        # modify the run to have an upgrade deadline in the past
        current_run.upgrade_deadline = self.now-timedelta(weeks=1)
        current_run.save()
        run_status = api.get_status_for_courserun(current_run, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.MISSED_DEADLINE

    def test_no_past_present_future(self):
        """
        Test in case the course run returns False to all the
        checks is_current, is_past, is_future, has_final_grades
        """
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': True,
            'has_paid.return_value': True,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        crun = self.create_run(
            start=None,
            end=None,
            enr_start=None,
            enr_end=None,
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        with self.assertRaises(ImproperlyConfigured):
            api.get_status_for_courserun(crun, self.mmtrack)

    @ddt.data(
        (False, None, api.CourseRunStatus.MISSED_DEADLINE),
        (True, False, api.CourseRunStatus.CAN_UPGRADE),
    )
    @ddt.unpack
    def test_not_paid_in_past(self, is_upgradable, has_final_grades, expected_status):
        """test for get_status_for_courserun for course not paid but that is past"""
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': False,
            'has_paid.return_value': False,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        with patch('courses.models.CourseRun.is_upgradable', new_callable=PropertyMock) as upgr_mock, patch(
            'courses.models.CourseRun.has_frozen_grades', new_callable=PropertyMock
        ) as froz_mock:
            upgr_mock.return_value = is_upgradable
            froz_mock.return_value = has_final_grades
            run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == expected_status
        assert run_status.course_run == crun

    @patch('grades.api.freeze_user_final_grade', autospec=True)
    @patch('courses.models.CourseRun.is_upgradable', new_callable=PropertyMock)
    @patch('courses.models.CourseRun.has_frozen_grades', new_callable=PropertyMock)
    @ddt.data(
        (True, api.CourseRunStatus.CAN_UPGRADE),
        (False, api.CourseRunStatus.NOT_PASSED)
    )
    @ddt.unpack
    def test_not_paid_in_past_grade_frozen_not_exists(
            self, passed, status, froz_mock, upgr_mock, freeze_mock):
        """
        test for get_status_for_courserun for a past course run that is
        not paid, grades are already frozen, the user does not have a final grade,
        and an attempt to freeze the user's final grade succeeds
        """
        upgr_mock.return_value = True
        froz_mock.return_value = True

        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': False,
            'has_paid.return_value': False,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
            'get_required_final_grade.side_effect': FinalGrade.DoesNotExist,
        })
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        # depending on the passed, there is a different ststus
        freeze_mock.return_value = Mock(passed=passed)
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == status

    @patch('grades.api.freeze_user_final_grade', autospec=True)
    @patch('courses.models.CourseRun.is_upgradable', new_callable=PropertyMock)
    @patch('courses.models.CourseRun.has_frozen_grades', new_callable=PropertyMock)
    def test_not_paid_in_past_grade_frozen_not_exists_raises(self, froz_mock, upgr_mock, freeze_mock):
        """
        test for get_status_for_courserun for a past course run that is
        not paid, grades are already frozen, the user does not have a final grade,
        and an attempt to freeze the user's final grade results in an exception
        """
        upgr_mock.return_value = True
        froz_mock.return_value = True

        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': False,
            'has_paid.return_value': False,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
            'get_required_final_grade.side_effect': FinalGrade.DoesNotExist,
        })
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        # in case the sync freeze raises, the tested function raises
        freeze_mock.side_effect = FreezeGradeFailedException
        with self.assertRaises(FreezeGradeFailedException):
            api.get_status_for_courserun(crun, self.mmtrack)

    @patch('courses.models.CourseRun.is_upgradable', new_callable=PropertyMock)
    @patch('courses.models.CourseRun.has_frozen_grades', new_callable=PropertyMock)
    @ddt.data(
        (True, api.CourseRunStatus.CAN_UPGRADE),
        (False, api.CourseRunStatus.NOT_PASSED)
    )
    @ddt.unpack
    def test_not_paid_in_past_grade_frozen_exists(self, passed, status, froz_mock, upgr_mock):
        """
        test for get_status_for_courserun for a past course run that is
        not paid, grades are already frozen, and the user has a final grade.
        """
        upgr_mock.return_value = True
        froz_mock.return_value = True

        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': True,
            'is_enrolled_mmtrack.return_value': False,
            'has_paid.return_value': False,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
            'get_required_final_grade.return_value': Mock(passed=passed),
        })
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == status

    def test_status_for_run_not_enrolled_but_paid(self):
        """test for get_status_for_courserun for course without enrollment and it is paid"""
        self.mmtrack.configure_mock(**{
            'is_enrolled.return_value': False,
            'is_enrolled_mmtrack.return_value': False,
            'has_paid.return_value': True,
            'has_paid_final_grade.return_value': False,
            'has_final_grade.return_value': False,
        })
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            edx_key='foo_edx_key'
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert isinstance(run_status, api.CourseRunUserStatus)
        assert run_status.status == api.CourseRunStatus.PAID_BUT_NOT_ENROLLED
        assert run_status.course_run == crun


@ddt.ddt
@patch('dashboard.api.get_certificate_url', return_value="")
@patch('dashboard.api.get_future_exam_runs', return_value=[])
@patch('dashboard.api.has_to_pay_for_exam', return_value=False)
class InfoCourseTest(CourseTests):
    """Tests for get_info_for_course"""

    @classmethod
    def setUpTestData(cls):
        super(InfoCourseTest, cls).setUpTestData()
        cls.user = UserFactory()
        cls.course_noruns = CourseFactory.create(title="Title no runs")

        now = now_in_utc()
        # create a run that is current
        cls.course_run = cls.create_run(
            cls,
            start=now-timedelta(weeks=1),
            end=now+timedelta(weeks=2),
            enr_start=now-timedelta(weeks=10),
            enr_end=now+timedelta(weeks=1),
            edx_key="course-v1:MITx+8.MechCX+2014_T1",
            title="Mechanical"
        )
        # and a run that is past and verified
        cls.course_run_ver = cls.create_run(
            cls,
            start=now-timedelta(weeks=10),
            end=now-timedelta(weeks=2),
            enr_start=now-timedelta(weeks=20),
            enr_end=now-timedelta(weeks=10),
            edx_key="course-v1:edX+DemoX+Demo_Course",
            title="Demo"
        )

        cls.course_no_next_run = CourseFactory.create(title="Title no next run")
        cls.course_run_past = cls.create_run(
            cls,
            course=cls.course_no_next_run,
            start=now-timedelta(weeks=10),
            end=now-timedelta(weeks=2),
            enr_start=now-timedelta(weeks=20),
            enr_end=now-timedelta(weeks=10),
            edx_key="course-v1:odl+FOO101+CR-FALL15",
            title="Foo course"
        )
        # and a run that is past and verified
        cls.course_run_past_ver = cls.create_run(
            cls,
            course=cls.course_no_next_run,
            start=now-timedelta(weeks=30),
            end=now-timedelta(weeks=32),
            enr_start=now-timedelta(weeks=50),
            enr_end=now-timedelta(weeks=30),
            edx_key="course-v1:edX+DemoX+Demo_Course_2",
            title="Demo 2"
        )

    def setUp(self):
        super().setUp()
        # default behavior for some mmtrack mocked methods
        self.mmtrack.get_course_proctorate_exam_results.return_value = []

    def assert_course_equal(
            self,
            course,
            course_data_from_call,
            can_schedule_exam=False,
            exams_schedulable_in_future=None,
            has_to_pay=False,
            has_exam=False,
            proct_exams=None
    ):
        """Helper to format the course info"""
        proct_exams = proct_exams or []
        exams_schedulable_in_future = exams_schedulable_in_future or []
        expected_data = {
            "id": course.pk,
            "title": course.title,
            "position_in_program": course.position_in_program,
            "description": course.description,
            "prerequisites": course.prerequisites,
            "has_contact_email": bool(course.contact_email),
            "can_schedule_exam": can_schedule_exam,
            "exams_schedulable_in_future": exams_schedulable_in_future,
            "has_to_pay": has_to_pay,
            "proctorate_exams_grades": proct_exams,
            "has_exam": has_exam,
            "certificate_url": ""
        }
        # remove the runs part: assumed checked with the mock assertion
        del course_data_from_call['runs']
        self.assertEqual(expected_data, course_data_from_call)

    def get_mock_run_status_func(self, status, specific_run, other_run_status):
        """Helper method to return mocked functions for getting course run status"""
        def mock_return_status(actual_course_run, *args, **kargs):
            """Mock function for get_status_for_courserun"""
            # pylint: disable=unused-argument
            if actual_course_run == specific_run:
                return api.CourseRunUserStatus(
                    status=status,
                    course_run=actual_course_run
                )
            return api.CourseRunUserStatus(
                status=other_run_status,
                course_run=actual_course_run
            )
        return mock_return_status

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_no_runs(self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with no runs"""
        self.assert_course_equal(
            self.course_noruns,
            api.get_info_for_course(self.course_noruns, self.mmtrack)
        )
        assert mock_format.called is False
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_with_contact_email(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay
    ):  # pylint: disable=no-self-use
        """test that get_info_for_course indicates that a course has a contact_email """
        course = CourseFactory.create(contact_email="abc@example.com")
        course_info = api.get_info_for_course(course, self.mmtrack)
        assert course_info['has_contact_email'] is True
        assert mock_format.called is False
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.is_exam_schedulable')
    @ddt.data((True), (False))
    def test_info_returns_exam_schedulable(
            self, boolean, mock_schedulable, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test that get_info_for_course returns whether the exam is schedulable"""
        course = CourseFactory.create(contact_email=None)
        mock_schedulable.return_value = boolean
        course_info = api.get_info_for_course(course, self.mmtrack)
        assert course_info['can_schedule_exam'] == boolean
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_returns_has_exam(self, mock_schedulable, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test that get_info_for_course returns whether the course has an exam module or not"""
        course = CourseFactory.create(contact_email=None)
        self.assert_course_equal(
            course,
            api.get_info_for_course(course, self.mmtrack)
        )
        ExamRunFactory.create(course=course)
        self.assert_course_equal(
            course,
            api.get_info_for_course(course, self.mmtrack),
            has_exam=True
        )
        assert mock_schedulable.call_count == 2
        assert mock_has_to_pay.call_count == 2
        assert mock_future_exams.call_count == 2
        assert mock_get_cert.call_count == 2

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_without_contact_email(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay
    ):  # pylint: disable=no-self-use
        """test that get_info_for_course indicates that a course has no contact_email """
        course = CourseFactory.create(contact_email=None)
        course_info = api.get_info_for_course(course, self.mmtrack)
        assert course_info['has_contact_email'] is False
        assert mock_format.called is False
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_not_enrolled_offered(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with with an offered run"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            return_value=api.CourseRunUserStatus(
                status=api.CourseRunStatus.NOT_ENROLLED,
                course_run=self.course_run
            )
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.OFFERED, self.mmtrack, position=1)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_not_enrolled_but_paid(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with with a paid but not enrolled run"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            return_value=api.CourseRunUserStatus(
                status=api.CourseRunStatus.PAID_BUT_NOT_ENROLLED,
                course_run=self.course_run
            )
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_called_once_with(
            self.course_run,
            api.CourseStatus.PAID_BUT_NOT_ENROLLED,
            self.mmtrack,
            position=1
        )
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_not_passed_offered(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with a run not passed and another offered"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.NOT_PASSED, self.course_run_ver, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        # the mock object has been called 2 times
        # one for the one that is past
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, self.mmtrack, position=1)
        # one for the course that is current run
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, self.mmtrack, position=2)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_not_enrolled_not_passed_not_offered(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with run not passed and nothing offered"""
        self.mmtrack.configure_mock(**{'has_passed_course.return_value': False})
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CHECK_IF_PASSED, self.course_run, api.CourseRunStatus.CHECK_IF_PASSED),
        ), patch('courses.models.Course.first_unexpired_run', return_value=None):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.NOT_PASSED, self.mmtrack, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, self.mmtrack, position=2)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_grade(self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with a course current and another not passed"""
        self.mmtrack.configure_mock(**{'has_passed_course.return_value': False})
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CURRENTLY_ENROLLED, self.course_run, api.CourseRunStatus.CHECK_IF_PASSED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.CURRENTLY_ENROLLED, self.mmtrack, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, self.mmtrack, position=2)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_check_but_not_passed(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay,):
        """
        test for get_info_for_course in case a check if the course has been passed is required
        """
        self.mmtrack.configure_mock(**{'has_passed_course.return_value': False})
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.NOT_ENROLLED, self.course_run, api.CourseRunStatus.CHECK_IF_PASSED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, self.mmtrack, position=1)
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, self.mmtrack, position=2)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_missed_deadline(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        test for get_info_for_course with a missed upgrade deadline
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.NOT_ENROLLED, self.course_run, api.CourseRunStatus.MISSED_DEADLINE),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.MISSED_DEADLINE, self.mmtrack, position=1)
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, self.mmtrack, position=2)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_check_but_not_passed_no_next(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        test for get_info_for_course in case a check if the course has been passed
        is required for the course, the course has not been passed and there is no next run
        """
        self.mmtrack.configure_mock(**{'has_passed_course.return_value': False})
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CHECK_IF_PASSED, self.course_run_past, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course_no_next_run,
                api.get_info_for_course(self.course_no_next_run, self.mmtrack)
            )
        mock_format.assert_called_once_with(
            self.course_run_past, api.CourseStatus.NOT_PASSED, self.mmtrack, position=1)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_check_passed(self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        test for get_info_for_course in case a check if the course has been passed
        is required for the course and the course has been passed
        """
        self.mmtrack.configure_mock(**{'has_passed_course.return_value': True})
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CHECK_IF_PASSED, self.course_run_ver, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_called_once_with(
            self.course_run_ver,
            api.CourseStatus.PASSED,
            self.mmtrack,
            position=1
        )
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_will_attend(self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with enrolled run that will happen in the future"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.WILL_ATTEND, self.course_run, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.WILL_ATTEND, self.mmtrack, position=1)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_upgrade(self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course for course with a run that needs to be upgraded"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CAN_UPGRADE, self.course_run, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.CAN_UPGRADE, self.mmtrack, position=1)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_upgrade_in_past(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        test for get_info_for_course for course with a run
        that needs to be upgraded but before a current enrolled one
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CURRENTLY_ENROLLED, self.course_run, api.CourseRunStatus.CAN_UPGRADE),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.CURRENTLY_ENROLLED, self.mmtrack, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.CAN_UPGRADE, self.mmtrack, position=2)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_default_should_not_happen(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        test for get_info_for_course for course with a run with an
        unexpected state but that can be offered
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                'status-that-we-should-never-have', self.course_run, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        assert mock_format.call_count == 0
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_default_should_not_happen_no_next(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """test for get_info_for_course with no next and weird status"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                'status-that-we-should-never-have', self.course_run_past, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course_no_next_run,
                api.get_info_for_course(self.course_no_next_run, self.mmtrack)
            )
        assert mock_format.call_count == 0
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_info_read_cert_for_all_no_next(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        test for get_info_for_course in case the less recent course is flagged to be checked if passed
        """
        self.mmtrack.configure_mock(**{'has_passed_course.return_value': True})
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.NOT_PASSED, self.course_run_past, api.CourseRunStatus.CHECK_IF_PASSED),
        ):
            self.assert_course_equal(
                self.course_no_next_run,
                api.get_info_for_course(self.course_no_next_run, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run_past, api.CourseStatus.NOT_PASSED, self.mmtrack, position=1)
        mock_format.assert_any_call(
            self.course_run_past_ver,
            api.CourseStatus.PASSED,
            self.mmtrack,
            position=2
        )
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_course_run_end_date_mixed(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        Test with a mix of end_date being None and also a valid date
        """
        def mocked_get_status_for_courserun(run, enrollments):  # pylint: disable=unused-argument
            """Mock get_status_for_courserun with different values for each run"""
            return api.CourseRunUserStatus(
                status=api.CourseRunStatus.NOT_ENROLLED,
                course_run=run
            )

        self.mmtrack.configure_mock(**{'user': self.user})

        run1 = CourseRunFactory.create(
            start_date=now_in_utc(),
            end_date=None,
            enrollment_start=None,
            enrollment_end=None
        )
        CourseRunFactory.create(
            start_date=now_in_utc(),
            end_date=now_in_utc(),
            enrollment_start=None,
            enrollment_end=None,
            course=run1.course
        )
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=mocked_get_status_for_courserun
        ):
            self.assert_course_equal(
                run1.course,
                api.get_info_for_course(run1.course, self.mmtrack),
            )
        mock_format.assert_called_once_with(run1, api.CourseStatus.OFFERED, self.mmtrack, position=1)
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    @patch('dashboard.api.is_exam_schedulable', return_value=False)
    def test_course_with_proctorate_exam(
            self, mock_schedulable, mock_format, mock_get_cert, mock_future_exams, mock_has_to_pay):
        """
        Test with proctorate exam results
        """
        for _ in range(3):
            ProctoredExamGradeFactory.create(user=self.user, course=self.course_noruns)
        proct_exam_qset = ProctoredExamGrade.for_user_course(user=self.user, course=self.course_noruns)
        serialized_proct_exams = ProctoredExamGradeSerializer(proct_exam_qset, many=True).data
        self.mmtrack.get_course_proctorate_exam_results.return_value = serialized_proct_exams
        self.assert_course_equal(
            self.course_noruns,
            api.get_info_for_course(self.course_noruns, self.mmtrack),
            proct_exams=serialized_proct_exams
        )
        assert mock_format.called is False
        assert mock_schedulable.call_count == 1
        assert mock_has_to_pay.call_count == 1
        assert mock_future_exams.call_count == 1
        assert mock_get_cert.call_count == 1
        self.mmtrack.get_course_proctorate_exam_results.assert_called_once_with(self.course_noruns)


class UserProgramInfoIntegrationTest(MockedESTestCase):
    """Integration tests for get_user_program_info"""
    @classmethod
    def setUpTestData(cls):
        super(UserProgramInfoIntegrationTest, cls).setUpTestData()
        cls.user = UserFactory()
        # create the programs
        cls.program_non_fin_aid = FullProgramFactory.create(live=True)
        cls.program_fin_aid = FullProgramFactory.create(live=True, financial_aid_availability=True)
        cls.program_unenrolled = FullProgramFactory.create(live=True)
        cls.program_not_live = ProgramFactory.create(live=False)
        for program in [cls.program_non_fin_aid, cls.program_fin_aid, cls.program_not_live]:
            models.ProgramEnrollment.objects.create(user=cls.user, program=program)

    def setUp(self):
        super().setUp()
        self.expected_programs = [self.program_non_fin_aid, self.program_fin_aid]
        self.edx_client = MagicMock()

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=MagicMock)
    def test_format(self, mock_cache_refresh):
        """Test that get_user_program_info fetches edx data and returns a list of Program data"""
        result = api.get_user_program_info(self.user, self.edx_client)

        assert mock_cache_refresh.call_count == len(CachedEdxDataApi.SUPPORTED_CACHES)
        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            mock_cache_refresh.assert_any_call(self.user, self.edx_client, cache_type)

        assert isinstance(result, dict)
        assert 'is_edx_data_fresh' in result
        assert result['is_edx_data_fresh'] is False
        assert 'programs' in result
        assert len(result['programs']) == 2
        for i in range(2):
            expected = {
                "id": self.expected_programs[i].id,
                "description": self.expected_programs[i].description,
                "title": self.expected_programs[i].title,
                "financial_aid_availability": self.expected_programs[i].financial_aid_availability,
            }
            assert is_subset_dict(expected, result['programs'][i])

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=MagicMock)
    def test_when_edx_client_is_none(self, mock_cache_refresh):
        """Test that the edx data is not refreshed"""
        api.get_user_program_info(self.user, None)
        assert mock_cache_refresh.call_count == 0

    def test_past_course_runs(self):
        """Test that past course runs are returned in the API results"""
        # Set a course run to be failed
        now = now_in_utc()
        program = self.program_non_fin_aid
        course = program.course_set.first()

        failed_course_run = course.courserun_set.first()
        failed_course_run.end_date = now - timedelta(days=1)
        failed_course_run.upgrade_deadline = now - timedelta(days=1)
        failed_course_run.save()
        CachedEnrollmentFactory.create(user=self.user, course_run=failed_course_run)
        CachedCurrentGradeFactory.create(user=self.user, course_run=failed_course_run)
        FinalGrade.objects.create(
            user=self.user,
            course_run=failed_course_run,
            grade=0.1,
            passed=False,
            status=FinalGradeStatus.COMPLETE,
            course_run_paid_on_edx=True
        )
        CourseRunGradingStatus.objects.create(
            course_run=failed_course_run,
            status=FinalGradeStatus.COMPLETE
        )

        # Create a course run previous to that one, and set it to be failed as well
        previous_failed_course_run = CourseRunFactory.create(
            course=course,
            end_date=failed_course_run.end_date - timedelta(days=30),
            upgrade_deadline=failed_course_run.upgrade_deadline - timedelta(days=30)
        )
        CachedEnrollmentFactory.create(user=self.user, course_run=previous_failed_course_run)
        CachedCurrentGradeFactory.create(user=self.user, course_run=previous_failed_course_run)
        FinalGrade.objects.create(
            user=self.user,
            course_run=previous_failed_course_run,
            grade=0.1,
            passed=False,
            status=FinalGradeStatus.COMPLETE,
            course_run_paid_on_edx=True
        )
        CourseRunGradingStatus.objects.create(
            course_run=previous_failed_course_run,
            status=FinalGradeStatus.COMPLETE
        )

        # set the last access for the cache
        UserCacheRefreshTimeFactory.create(user=self.user, unexpired=True)

        result = api.get_user_program_info(self.user, self.edx_client)
        # extract the right program from the result
        program_result = None
        for res in result['programs']:
            if res['id'] == program.pk:
                program_result = res
                break
        assert program_result is not None
        assert len(result['programs']) > 0
        assert len(result['programs'][0]['courses']) > 0
        assert len(result['programs'][0]['courses'][0]['runs']) == 2
        assert all(
            [run['status'] == api.CourseStatus.NOT_PASSED for run in result['programs'][0]['courses'][0]['runs']]
        )

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=MagicMock)
    def test_exception_in_refresh_cache_1(self, mock_cache_refresh):
        """Test in case the backend refresh cache raises a InvalidCredentialStored exception"""
        mock_cache_refresh.side_effect = InvalidCredentialStored('error', http_status.HTTP_400_BAD_REQUEST)
        with self.assertRaises(InvalidCredentialStored):
            api.get_user_program_info(self.user, self.edx_client)

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=MagicMock)
    def test_exception_in_refresh_cache_2(self, mock_cache_refresh):
        """Test in case the backend refresh cache raises any other exception"""
        mock_cache_refresh.side_effect = ZeroDivisionError
        result = api.get_user_program_info(self.user, self.edx_client)
        assert isinstance(result, dict)
        assert 'is_edx_data_fresh' in result
        assert result['is_edx_data_fresh'] is False
        assert 'programs' in result
        assert len(result['programs']) == 2


class InfoProgramTest(MockedESTestCase):
    """Tests for get_info_for_program"""
    @classmethod
    def setUpTestData(cls):
        super(InfoProgramTest, cls).setUpTestData()
        cls.user = UserFactory()
        # create the programs
        cls.program = ProgramFactory.create()
        cls.program_no_courses = ProgramFactory.create()

        # create some courses for the program
        cls.courses = []
        for num in range(2):
            cls.courses.append(
                CourseFactory.create(
                    title="title course prog1 {}".format(num),
                    program=cls.program
                )
            )

    def setUp(self):
        super().setUp()
        self.mmtrack = MagicMock(wraps=MMTrack)

    @patch('dashboard.api.get_info_for_course', autospec=True)
    def test_program(self, mock_info_course):
        """Test happy path"""
        self.mmtrack.configure_mock(**{
            'program': self.program,
            'financial_aid_available': False,
            'get_pearson_exam_status.return_value': ExamProfile.PROFILE_SUCCESS,
            'calculate_final_grade_average.return_value': 91,
            'get_program_certificate_url.return_value': "",
        })
        mock_info_course.return_value = {'position_in_program': 1}
        res = api.get_info_for_program(self.mmtrack)
        for course in self.courses:
            mock_info_course.assert_any_call(course, self.mmtrack)
        expected_data = {
            "id": self.program.pk,
            "description": self.program.description,
            "title": self.program.title,
            "courses": [{'position_in_program': 1}, {'position_in_program': 1}],
            "financial_aid_availability": False,
            "pearson_exam_status": ExamProfile.PROFILE_SUCCESS,
            "grade_average": 91,
            "certificate": "",
        }
        self.assertEqual(res, expected_data)

    @patch('dashboard.api.get_info_for_course', autospec=True)
    def test_program_no_courses(self, mock_info_course):
        """Test program with no courses"""
        self.mmtrack.configure_mock(**{
            'program': self.program_no_courses,
            'financial_aid_available': False,
            'get_pearson_exam_status.return_value': ExamProfile.PROFILE_INVALID,
            'calculate_final_grade_average.return_value': 91,
            'get_program_certificate_url.return_value': "",
        })
        res = api.get_info_for_program(self.mmtrack)
        assert mock_info_course.called is False
        expected_data = {
            "id": self.program_no_courses.pk,
            "description": self.program_no_courses.description,
            "title": self.program_no_courses.title,
            "courses": [],
            "financial_aid_availability": False,
            "pearson_exam_status": ExamProfile.PROFILE_INVALID,
            "grade_average": 91,
            "certificate": "",
        }
        self.assertEqual(res, expected_data)

    @patch('dashboard.api.get_info_for_course', autospec=True)
    @patch('financialaid.serializers.FinancialAidDashboardSerializer.serialize', new_callable=MagicMock)
    def test_program_financial_aid(self, mock_fin_aid_serialize, mock_info_course):
        """Test happy path"""
        self.mmtrack.configure_mock(**{
            'program': self.program,
            'get_pearson_exam_status.return_value': ExamProfile.PROFILE_IN_PROGRESS,
            'calculate_final_grade_average.return_value': 91,
            'financial_aid_available': True,
            'get_program_certificate_url.return_value': "",
        })
        serialized_fin_aid = {
            "id": 123,
            "has_user_applied": True,
            "application_status": "WHO-KNOWS",
            "min_possible_cost": 100,
            "max_possible_cost": 200,
            "date_documents_sent": now_in_utc() - timedelta(hours=12)
        }
        mock_fin_aid_serialize.return_value = serialized_fin_aid
        mock_info_course.return_value = {'position_in_program': 1}
        res = api.get_info_for_program(self.mmtrack)
        for course in self.courses:
            mock_info_course.assert_any_call(course, self.mmtrack)

        expected_data = {
            "id": self.program.pk,
            "description": self.program.description,
            "title": self.program.title,
            "courses": [{'position_in_program': 1}, {'position_in_program': 1}],
            "financial_aid_availability": True,
            "financial_aid_user_info": serialized_fin_aid,
            "pearson_exam_status": ExamProfile.PROFILE_IN_PROGRESS,
            "grade_average": 91,
            "certificate": "",
        }
        self.assertEqual(res, expected_data)


@ddt.ddt
class ExamSchedulableTests(MockedESTestCase):
    """Tests exam schedulable"""
    @ddt.data(
        (False, False),
        (False, True),
        (True, False),
    )
    @ddt.unpack
    def test_is_exam_schedulable(self, is_past, is_future):
        """Test that is_exam_schedule is correct"""
        exam_run = ExamRunFactory.create(scheduling_past=is_past, scheduling_future=is_future)
        exam_auth = ExamAuthorizationFactory.create(exam_run=exam_run, course=exam_run.course)

        assert api.is_exam_schedulable(exam_auth.user, exam_auth.course) is (not is_past and not is_future)


@ddt.ddt
class FutureExamRunsTests(MockedESTestCase):
    """Tests future schedulable exam runs"""

    @ddt.data(
        (False, True, 1),
        (True, False, 0),
        (False, False, 0),
    )
    @ddt.unpack
    def test_get_future_exam_runs(self, is_past, is_future, result):
        """test get_future_exam_runs"""
        exam_run = ExamRunFactory.create(scheduling_past=is_past, scheduling_future=is_future)

        assert len(api.get_future_exam_runs(exam_run.course)) == result


@ddt.ddt
class ExamAttemptsTests(CourseTests):
    """Tests exam attempts for user"""

    def setUp(self):
        super().setUp()
        self.mmtrack.user = self.user

    @ddt.data(
        (1, 1, False),
        (2, 1, True),
        (3, 1, True),
        (3, 2, False),
    )
    @ddt.unpack
    def test_has_to_pay(self, num_of_taken_exams, num_of_payments, result):
        """Test has_to_pay_for_exam"""
        self.mmtrack.get_payments_count_for_course.return_value = num_of_payments
        for _ in range(num_of_taken_exams):
            ExamAuthorizationFactory.create(user=self.user, course=self.course, exam_taken=True)
        assert api.has_to_pay_for_exam(self.mmtrack, self.course) is result


@ddt.ddt
class GetCertificateForCourse(CourseTests):
    """Tests get_certificate_url for a course"""

    def setUp(self):
        super().setUp()
        self.mmtrack.user = self.user
        self.mmtrack.financial_aid_available = True

        self.course_run = self.create_run(course=self.course)

    def test_get_certificate_url(self):
        """Test get_certificate_url for course with certificate"""

        final_grade = FinalGradeFactory.create(user=self.user, course_run=self.course_run, grade=0.8, passed=True)
        self.mmtrack.get_passing_final_grades_for_course.return_value = FinalGrade.objects.filter(user=self.user)
        cert = MicromastersCourseCertificateFactory.create(final_grade=final_grade)

        assert api.get_certificate_url(self.mmtrack, self.course) == '/certificate/course/{}'.format(cert.hash)

    def test_has_no_final_grade(self):
        """Test no final grade for a course"""
        self.mmtrack.get_passing_final_grades_for_course.return_value = FinalGrade.objects.filter(user=self.user)
        assert api.get_certificate_url(self.mmtrack, self.course) == ''

    def test_has_passing_grade_no_certificate(self):
        """Test has passing grade but no certificate"""
        FinalGradeFactory.create(user=self.user, course_run=self.course_run, grade=0.8, passed=True)
        self.mmtrack.get_passing_final_grades_for_course.return_value = FinalGrade.objects.filter(user=self.user)
        assert api.get_certificate_url(self.mmtrack, self.course) == ''

    @ddt.data(
        ("verified", True, True),
        ("audit", False, False),
        ("verified", False, False),
        ("audit", True, False),
    )
    @ddt.unpack
    def test_edx_course_certificate(self, certificate_type, is_passing, has_url):
        """Test edx certificate url for non FA courses"""
        FinalGradeFactory.create(user=self.user, course_run=self.course_run, grade=0.8, passed=True)
        self.mmtrack.get_passing_final_grades_for_course.return_value = FinalGrade.objects.filter(user=self.user)
        self.mmtrack.financial_aid_available = False
        self.mmtrack.has_passing_certificate.return_value = (certificate_type == "verified") and is_passing

        cert_json = {
            "username": "staff",
            "course_id": self.course_run.edx_course_key,
            "certificate_type": certificate_type,
            "is_passing": is_passing,
            "status": "downloadable",
            "download_url": "/certificates/user/course_key",
            "grade": "0.98"
        }
        self.mmtrack.certificates = CachedCertificate.deserialize_edx_data([cert_json])
        certificate_url = (settings.EDXORG_BASE_URL + "certificates/user/course_key") if has_url else ""
        assert api.get_certificate_url(self.mmtrack, self.course) == certificate_url
