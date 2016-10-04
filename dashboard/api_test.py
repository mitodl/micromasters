"""
Tests for the dashboard api functions
"""
import json
import os
from datetime import datetime, timedelta
from mock import patch, MagicMock

import pytz
from django.core.exceptions import ImproperlyConfigured

from edx_api.certificates.models import Certificate, Certificates
from edx_api.enrollments.models import Enrollments
from edx_api.grades.models import CurrentGrade, CurrentGrades

from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
)
from dashboard import (
    api,
    models,
)
from dashboard.utils import MMTrack
from profiles.factories import UserFactory
from search.base import ESTestCase


# pylint: disable=too-many-lines
class StatusTest(ESTestCase):
    """
    Tests for the different status classes
    """
    # pylint: disable= no-self-use
    def test_course_status(self):
        """test for CourseStatus"""
        for attr in ('PASSED', 'NOT_PASSED', 'CURRENTLY_ENROLLED', 'CAN_UPGRADE', 'OFFERED',):
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


class CourseTests(ESTestCase):
    """Base class for APIs tests"""

    @classmethod
    def setUpTestData(cls):
        super(CourseTests, cls).setUpTestData()
        cls.course = CourseFactory.create(title="Title")
        cls.user = UserFactory.create()

    def setUp(self):
        super(CourseTests, self).setUp()
        self.now = datetime.now(pytz.utc)
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

    def test_format_run_no_run(self):
        """Test for format_courserun_for_dashboard if there is no run"""
        self.assertIsNone(
            api.format_courserun_for_dashboard(None, api.CourseStatus.PASSED, self.mmtrack)
        )

    def test_format_run(self):
        """Test for format_courserun_for_dashboard"""
        self.mmtrack.configure_mock(**{
            'get_final_grade.return_value': 99.99,
            'get_current_grade.return_value': 33.33,
        })
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )

        expected_ret_data = {
            'title': crun.title,
            'status': api.CourseStatus.PASSED,
            'id': crun.pk,
            'course_id': crun.edx_course_key,
            'position': 1,
            'course_start_date': crun.start_date,
            'course_end_date': crun.end_date,
            'fuzzy_start_date': crun.fuzzy_start_date,
            'final_grade': 99.99,
        }

        self.assertEqual(
            api.format_courserun_for_dashboard(crun, api.CourseStatus.PASSED, self.mmtrack),
            expected_ret_data
        )

        # with different position
        expected_ret_data['position'] = 56
        self.assertEqual(
            api.format_courserun_for_dashboard(crun, api.CourseStatus.PASSED, self.mmtrack, position=56),
            expected_ret_data
        )

        # with not passed
        expected_ret_data.update({
            'status': api.CourseStatus.NOT_PASSED,
            'position': 1,
            'final_grade': 33.33,
        })
        self.assertEqual(
            api.format_courserun_for_dashboard(crun, api.CourseStatus.NOT_PASSED, self.mmtrack),
            expected_ret_data
        )

        # with currently enrolled
        expected_ret_data.update({
            'status': api.CourseStatus.CURRENTLY_ENROLLED,
            'current_grade': 33.33
        })
        del expected_ret_data['final_grade']
        self.assertEqual(
            api.format_courserun_for_dashboard(crun, api.CourseStatus.CURRENTLY_ENROLLED, self.mmtrack),
            expected_ret_data
        )

    def test_format_run_conditional(self):
        """Test for format_courserun_for_dashboard with conditional fields"""
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
                'fuzzy_start_date': crun.fuzzy_start_date
            }
        )

        # test that a weird status raises here
        with self.assertRaises(ImproperlyConfigured):
            api.format_courserun_for_dashboard(crun, 'foo_status', self.mmtrack)


class CourseRunTest(CourseTests):
    """Tests for get_status_for_courserun"""

    @classmethod
    def setUpTestData(cls):
        super(CourseRunTest, cls).setUpTestData()
        cls.now = datetime.now(pytz.utc)

    def test_status_for_run_not_enrolled(self):
        """test for get_status_for_courserun for course without enrollment"""
        self.mmtrack.configure_mock(**{'is_enrolled.return_value': False})
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
        self.mmtrack.configure_mock(**{'is_enrolled.return_value': True, 'is_enrolled_mmtrack.return_value': True})
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

    def test_check_if_passed(self):
        """test for get_status_for_courserun for a finished course"""
        self.mmtrack.configure_mock(**{'is_enrolled.return_value': True, 'is_enrolled_mmtrack.return_value': True})
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CHECK_IF_PASSED
        assert run_status.course_run == crun

    def test_read_will_attend(self):
        """test for get_status_for_courserun for an enrolled and paid future course"""
        self.mmtrack.configure_mock(**{'is_enrolled.return_value': True, 'is_enrolled_mmtrack.return_value': True})
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
        self.mmtrack.configure_mock(**{'is_enrolled.return_value': True, 'is_enrolled_mmtrack.return_value': False})
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
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        run_status = api.get_status_for_courserun(future_run, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CAN_UPGRADE
        assert run_status.course_run == future_run
        run_status = api.get_status_for_courserun(current_run, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.CAN_UPGRADE
        assert run_status.course_run == current_run

    def test_enrolled_upgradable(self):
        """test for get_status_for_courserun with check if course can be upgraded to paid"""
        self.mmtrack.configure_mock(**{'is_enrolled.return_value': True, 'is_enrolled_mmtrack.return_value': False})
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
        assert run_status.status == api.CourseRunStatus.NOT_PASSED

    def test_not_paid_not_passed(self):
        """test for get_status_for_courserun for course not paid but that is past"""
        self.mmtrack.configure_mock(**{'is_enrolled.return_value': True, 'is_enrolled_mmtrack.return_value': False})
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        run_status = api.get_status_for_courserun(crun, self.mmtrack)
        assert run_status.status == api.CourseRunStatus.NOT_PASSED
        assert run_status.course_run == crun


class InfoCourseTest(CourseTests):
    """Tests for get_info_for_course"""

    @classmethod
    def setUpTestData(cls):
        super(InfoCourseTest, cls).setUpTestData()
        cls.user = UserFactory()
        cls.course_noruns = CourseFactory.create(title="Title no runs")

        now = datetime.now(pytz.utc)
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
            edx_key="course-v1:edX+DemoX+Demo_Course",
            title="Demo 2"
        )

    def assert_course_equal(self, course, course_data_from_call):
        """Helper to format the course info"""
        expected_data = {
            "id": course.pk,
            "title": course.title,
            "position_in_program": course.position_in_program,
            "description": course.description,
            "prerequisites": course.prerequisites,
        }
        # remove the runs part: assumed checked with the mock assertion
        del course_data_from_call['runs']
        self.assertEqual(expected_data, course_data_from_call)

    def get_mock_run_status_func(self, status, specific_run, other_run_status):
        """Helper method to return mocked functions for getting course run status"""
        # pylint: disable=no-self-use
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
    def test_info_no_runs(self, mock_format):
        """test for get_info_for_course for course with no runs"""
        self.assert_course_equal(
            self.course_noruns,
            api.get_info_for_course(self.course_noruns, None)
        )
        assert mock_format.called is False

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_not_enrolled_offered(self, mock_format):
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
                api.get_info_for_course(self.course, None)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.OFFERED, None, position=1)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_not_passed_offered(self, mock_format):
        """test for get_info_for_course for course with a run not passed and another offered"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.NOT_PASSED, self.course_run_ver, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, None)
            )
        # the mock object has been called 2 times
        # one for the course that is current run
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, None, position=1)
        # one for the one that is past
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, None, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_not_enrolled_not_passed_not_offered(self, mock_format):
        """test for get_info_for_course for course with run not passed and nothing offered"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.NOT_PASSED, self.course_run, api.CourseRunStatus.NOT_PASSED),
        ), patch('courses.models.Course.get_next_run', autospec=True, return_value=None):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, None)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.NOT_PASSED, None, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, None, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_grade(self, mock_format):
        """test for get_info_for_course for course with a course current and another not passed"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CURRENTLY_ENROLLED, self.course_run, api.CourseRunStatus.NOT_PASSED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, None)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.CURRENTLY_ENROLLED, None, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, None, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_check_but_not_passed(self, mock_format):
        """
        test for get_info_for_course in case a check if the course has been passed is required
        """
        self.mmtrack.configure_mock(**{'has_passed_course.return_value': False})
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CHECK_IF_PASSED, self.course_run, api.CourseRunStatus.NOT_PASSED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, self.mmtrack, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, self.mmtrack, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_check_but_not_passed_no_next(self, mock_format):
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

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_check_passed(self, mock_format):
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

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_will_attend(self, mock_format):
        """test for get_info_for_course for course with enrolled run that will happen in the future"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.WILL_ATTEND, self.course_run, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, None)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.CURRENTLY_ENROLLED, None, position=1)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_upgrade(self, mock_format):
        """test for get_info_for_course for course with a run that needs to be upgraded"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.CAN_UPGRADE, self.course_run, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, None)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.CAN_UPGRADE, None, position=1)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_default_should_not_happen(self, mock_format):
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
                api.get_info_for_course(self.course, None)
            )
        assert mock_format.call_count == 0

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_default_should_not_happen_no_next(self, mock_format):
        """test for get_info_for_course with no next and weird status"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                'status-that-we-should-never-have', self.course_run_past, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course_no_next_run,
                api.get_info_for_course(self.course_no_next_run, None)
            )
        assert mock_format.call_count == 0

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_read_cert_for_all_no_next(self, mock_format):
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

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_course_run_end_date_mixed(self, mock_format):
        """
        Test with a mix of end_date being None and also a valid date
        """
        def mocked_get_status_for_courserun(run, enrollments):  # pylint: disable=unused-argument
            """Mock get_status_for_courserun with different values for each run"""
            return api.CourseRunUserStatus(
                status=api.CourseRunStatus.NOT_ENROLLED,
                course_run=run
            )

        run1 = CourseRunFactory.create(
            start_date=datetime.now(pytz.utc),
            end_date=None,
            enrollment_start=None,
            enrollment_end=None
        )
        CourseRunFactory.create(
            start_date=datetime.now(pytz.utc),
            end_date=datetime.now(pytz.utc),
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
                api.get_info_for_course(run1.course, None)
            )
        mock_format.assert_called_once_with(run1, api.CourseStatus.OFFERED, None, position=1)


class InfoProgramTest(ESTestCase):
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
            'financial_aid_available': False
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
        }
        self.assertEqual(res, expected_data)

    @patch('dashboard.api.get_info_for_course', autospec=True)
    def test_program_no_courses(self, mock_info_course):
        """Test program with no courses"""
        self.mmtrack.configure_mock(**{
            'program': self.program_no_courses,
            'financial_aid_available': False
        })
        res = api.get_info_for_program(self.mmtrack)
        assert mock_info_course.called is False
        expected_data = {
            "id": self.program_no_courses.pk,
            "description": self.program_no_courses.description,
            "title": self.program_no_courses.title,
            "courses": [],
            "financial_aid_availability": False,
        }
        self.assertEqual(res, expected_data)

    @patch('dashboard.api.get_info_for_course', autospec=True)
    def test_program_financial_aid(self, mock_info_course):
        """Test happy path"""
        kwargs = {
            'financial_aid_id': 1122334455,
            'program': self.program,
            'financial_aid_available': True,
            'financial_aid_applied': True,
            'financial_aid_status': 'WHO-KNOWS',
            'financial_aid_min_price': 123,
            'financial_aid_max_price': 456,
            'financial_aid_date_documents_sent': datetime.now(pytz.utc) - timedelta(hours=12)
        }
        self.mmtrack.configure_mock(**kwargs)
        mock_info_course.return_value = {'position_in_program': 1}
        res = api.get_info_for_program(self.mmtrack)
        for course in self.courses:
            mock_info_course.assert_any_call(course, self.mmtrack)
        expected_data = {
            "id": self.program.pk,
            "description": self.program.description,
            "title": self.program.title,
            "courses": [{'position_in_program': 1}, {'position_in_program': 1}],
            "financial_aid_availability": kwargs['financial_aid_available'],
            "financial_aid_user_info": {
                "id": kwargs['financial_aid_id'],
                "has_user_applied": kwargs['financial_aid_applied'],
                "application_status": kwargs['financial_aid_status'],
                "min_possible_cost": kwargs['financial_aid_min_price'],
                "max_possible_cost": kwargs['financial_aid_max_price'],
                "date_documents_sent": kwargs['financial_aid_date_documents_sent'],
            }
        }
        self.assertEqual(res, expected_data)


class CachedCertificatesTests(ESTestCase):
    """Tests get_student_certificates"""

    @classmethod
    def setUpTestData(cls):
        """
        Set up certificate
        """
        with open(os.path.join(os.path.dirname(__file__),
                               'fixtures/certificates.json')) as file_obj:
            certificates_json = json.loads(file_obj.read())

        cls.certificates = Certificates([Certificate(cert_json) for cert_json in certificates_json])

        all_runs = []
        cls.all_course_run_ids = []
        for certificate in cls.certificates.all_certs:
            all_runs.append(CourseRunFactory.create(edx_course_key=certificate.course_id))
            cls.all_course_run_ids.append(certificate.course_id)
        # add an extra course_run not coming from certificates
        fake_cert_id = 'foo+cert+key'
        all_runs.append(CourseRunFactory.create(edx_course_key=fake_cert_id))
        cls.all_course_run_ids.append(fake_cert_id)

        for run in all_runs:
            run.course.program.live = True
            run.course.program.save()

        cls.user = UserFactory.create()

    def assert_certificates_in_db(self, expected_timestamp, course_ids, certificates=None):
        """
        Check that self.certificates matches what's in the database
        """
        if certificates is None:
            certificates = self.certificates

        one_minute_before = expected_timestamp - timedelta(minutes=1)
        one_minute_after = expected_timestamp + timedelta(minutes=1)

        certificate_list = models.CachedCertificate.objects.filter(
            user=self.user,
            course_run__edx_course_key__in=course_ids,
        ).exclude(data__isnull=True)
        assert certificate_list.count() == len(course_ids)
        for certificate_obj in certificate_list:
            assert one_minute_before < certificate_obj.last_request < one_minute_after
            certificate = certificates.get_cert(certificate_obj.course_run.edx_course_key)
            assert certificate.json == certificate_obj.data

    def assert_null_entry_for_certs_in_db(self, expected_timestamp, course_ids):
        """
        Checks that the entry in the cache is null for the given course IDs.
        """
        one_minute_before = expected_timestamp - timedelta(minutes=1)
        one_minute_after = expected_timestamp + timedelta(minutes=1)

        certificate_list = models.CachedCertificate.objects.filter(
            user=self.user,
            course_run__edx_course_key__in=course_ids,
            data__isnull=True,
        )
        assert certificate_list.count() == len(course_ids)
        for certificate_obj in certificate_list:
            assert one_minute_before < certificate_obj.last_request < one_minute_after

    def test_new(self):
        """
        Get new student certificates from edX
        """
        mocked_get_student_certificates = MagicMock(
            return_value=self.certificates
        )
        edx_client = MagicMock(
            certificates=MagicMock(
                get_student_certificates=mocked_get_student_certificates
            )
        )

        username = 'fake_username'
        verified_course_ids = list(self.certificates.all_courses_verified_certs)
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            ret = api.get_student_certificates(self.user, edx_client)
        # Test that the certificates object returned by the edx_api function is exactly the same
        # object as what our function tests
        assert ret is self.certificates
        assert mocked_get_student_certificates.call_args[0] == (username, self.all_course_run_ids)
        now = datetime.now(tz=pytz.utc)
        self.assert_certificates_in_db(now, verified_course_ids)
        # assert that all the course run that not have a verified
        # certificate have a null entry in the cache DB
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(verified_course_ids)))
        )

    def test_cached(self):
        """
        If our copy of the certificate data is in the database, don't fetch from edX
        """
        now = datetime.now(tz=pytz.utc)
        five_hours_ago = now - timedelta(hours=5)

        mocked_get_student_certificates = MagicMock(
            return_value=self.certificates
        )
        edx_client = MagicMock(
            certificates=MagicMock(
                get_student_certificates=mocked_get_student_certificates
            )
        )

        verified_course_ids = list(self.certificates.all_courses_verified_certs)

        # Call get_student_certificates once to populate database
        username = 'fake_username'
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            api.get_student_certificates(self.user, edx_client)
        self.assert_certificates_in_db(now, verified_course_ids)
        # assert that all the course run that not have a verified
        # certificate have a null entry in the cache DB
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(verified_course_ids)))
        )

        models.CachedCertificate.objects.filter(user=self.user).update(last_request=five_hours_ago)

        # Assert that this second call doesn't update the database
        assert mocked_get_student_certificates.call_count == 1
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            api.get_student_certificates(self.user, edx_client)
        assert mocked_get_student_certificates.call_count == 1
        self.assert_certificates_in_db(five_hours_ago, verified_course_ids)
        # assert that all the course run that not have a verified
        # certificate have a null entry in the cache DB
        self.assert_null_entry_for_certs_in_db(
            five_hours_ago,
            list(set(self.all_course_run_ids).difference(set(verified_course_ids)))
        )

    def test_expired(self):
        """
        If our copy of the certificate data is expired, fetch from edX again
        """
        now = datetime.now(tz=pytz.utc)
        six_hour_1_min_ago = now - timedelta(minutes=1, hours=6)

        mocked_get_student_certificates = MagicMock(
            return_value=self.certificates
        )
        edx_client = MagicMock(
            certificates=MagicMock(
                get_student_certificates=mocked_get_student_certificates
            )
        )

        verified_course_ids = list(self.certificates.all_courses_verified_certs)

        # Call get_student_certificates once to populate database
        username = 'fake_username'
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            api.get_student_certificates(self.user, edx_client)
        self.assert_certificates_in_db(now, verified_course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(verified_course_ids)))
        )

        # set the last request to an expired time
        models.CachedCertificate.objects.filter(user=self.user).update(last_request=six_hour_1_min_ago)

        # Assert that this second call updates the database
        assert mocked_get_student_certificates.call_count == 1
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            api.get_student_certificates(self.user, edx_client)
        assert mocked_get_student_certificates.call_count == 2
        self.assert_certificates_in_db(now, verified_course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(verified_course_ids)))
        )

    def test_update(self):
        """
        Ensure that we replace existing data.
        """
        now = datetime.now(tz=pytz.utc)
        six_hour_1_min_ago = now - timedelta(minutes=1, hours=6)

        mocked_get_student_certificates = MagicMock(
            return_value=self.certificates
        )
        edx_client = MagicMock(
            certificates=MagicMock(
                get_student_certificates=mocked_get_student_certificates
            )
        )

        verified_course_ids = list(self.certificates.all_courses_verified_certs)

        # Call get_student_certificates once to populate database
        username = 'fake_username'
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            api.get_student_certificates(self.user, edx_client)
        self.assert_certificates_in_db(now, verified_course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(verified_course_ids)))
        )

        models.CachedCertificate.objects.filter(user=self.user).update(last_request=six_hour_1_min_ago)

        # update certificate
        first_cert = list(self.certificates.all_verified_certs)[0]
        cert_data = dict(first_cert.json)
        cert_data['grade'] = 123
        updated_certs = Certificates([Certificate(cert_data)])

        # Get certificates
        mocked_get_student_certificates = MagicMock(
            return_value=updated_certs
        )
        edx_client = MagicMock(
            certificates=MagicMock(
                get_student_certificates=mocked_get_student_certificates
            )
        )
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            api.get_student_certificates(self.user, edx_client)
        assert mocked_get_student_certificates.call_count == 1
        self.assert_certificates_in_db(now, verified_course_ids, updated_certs)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(verified_course_ids)))
        )


class CachedEnrollmentsTests(ESTestCase):
    """Tests get_student_enrollments"""

    @classmethod
    def setUpTestData(cls):
        """
        Set up enrollments
        """
        with open(os.path.join(os.path.dirname(__file__),
                               'fixtures/user_enrollments.json')) as file_obj:
            enrollments_json = json.loads(file_obj.read())

        cls.enrollments = Enrollments([enrollment_json for enrollment_json in enrollments_json])
        all_runs = []
        cls.all_course_run_ids = []
        for enrollment in cls.enrollments.enrolled_courses:
            all_runs.append(CourseRunFactory.create(edx_course_key=enrollment.course_id))
            cls.all_course_run_ids.append(enrollment.course_id)
        # add an extra course_run not coming from certificates
        fake_cert_id = 'foo+cert+key'
        all_runs.append(CourseRunFactory.create(edx_course_key=fake_cert_id))
        cls.all_course_run_ids.append(fake_cert_id)

        for run in all_runs:
            run.course.program.live = True
            run.course.program.save()

        cls.user = UserFactory.create()

    def assert_enrollments_in_db(self, expected_timestamp, course_ids, enrollments=None):
        """
        Check that self.enrollments matches what's in the database
        """
        if enrollments is None:
            enrollments = self.enrollments

        one_minute_before = expected_timestamp - timedelta(minutes=1)
        one_minute_after = expected_timestamp + timedelta(minutes=1)

        enrollments_list = models.CachedEnrollment.objects.filter(
            user=self.user,
            course_run__edx_course_key__in=course_ids,
        ).exclude(data__isnull=True)
        assert enrollments_list.count() == len(course_ids)
        for enrollment_obj in enrollments_list:
            assert one_minute_before < enrollment_obj.last_request < one_minute_after
            enrollment = enrollments.enrollments[enrollment_obj.course_run.edx_course_key]
            assert enrollment.json == enrollment_obj.data

    def assert_null_entry_for_certs_in_db(self, expected_timestamp, course_ids):
        """
        Checks that the entry in the cache is null for the given course IDs.
        """
        one_minute_before = expected_timestamp - timedelta(minutes=1)
        one_minute_after = expected_timestamp + timedelta(minutes=1)

        enrollments_list = models.CachedEnrollment.objects.filter(
            user=self.user,
            course_run__edx_course_key__in=course_ids,
            data__isnull=True,
        )
        assert enrollments_list.count() == len(course_ids)
        for certificate_obj in enrollments_list:
            assert one_minute_before < certificate_obj.last_request < one_minute_after

    def test_new(self):
        """
        Get new student enrollments from edX
        """
        mocked_get_student_enrollments = MagicMock(
            return_value=self.enrollments
        )
        edx_client = MagicMock(
            enrollments=MagicMock(
                get_student_enrollments=mocked_get_student_enrollments
            )
        )

        course_ids = self.enrollments.get_enrolled_course_ids()
        ret = api.get_student_enrollments(self.user, edx_client)
        # Test that the enrollments object returned by the edx_api function is exactly the same
        # object as what our function tests
        assert ret is self.enrollments
        assert mocked_get_student_enrollments.call_args[0] == ()
        now = datetime.now(tz=pytz.utc)
        self.assert_enrollments_in_db(now, course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

    def test_cached(self):
        """
        If our copy of the enrollment data is in the database, don't fetch from edX
        """
        now = datetime.now(tz=pytz.utc)
        four_minutes_ago = now - timedelta(minutes=4)

        mocked_get_student_enrollments = MagicMock(
            return_value=self.enrollments
        )
        edx_client = MagicMock(
            enrollments=MagicMock(
                get_student_enrollments=mocked_get_student_enrollments
            )
        )

        course_ids = self.enrollments.get_enrolled_course_ids()

        # Call get_student_enrollments once to populate database
        api.get_student_enrollments(self.user, edx_client)
        self.assert_enrollments_in_db(now, course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

        models.CachedEnrollment.objects.filter(user=self.user).update(last_request=four_minutes_ago)

        # Assert that this second call doesn't update the database
        assert mocked_get_student_enrollments.call_count == 1
        api.get_student_enrollments(self.user, edx_client)
        assert mocked_get_student_enrollments.call_count == 1
        self.assert_enrollments_in_db(four_minutes_ago, course_ids)
        self.assert_null_entry_for_certs_in_db(
            four_minutes_ago,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

    def test_expired(self):
        """
        If our copy of the enrollment data is expired, fetch from edX again
        """
        now = datetime.now(tz=pytz.utc)
        six_hour_1_min_ago = now - timedelta(minutes=1, hours=6)

        mocked_get_student_enrollments = MagicMock(
            return_value=self.enrollments
        )
        edx_client = MagicMock(
            enrollments=MagicMock(
                get_student_enrollments=mocked_get_student_enrollments
            )
        )

        course_ids = self.enrollments.get_enrolled_course_ids()

        # Call get_student_enrollments once to populate database
        api.get_student_enrollments(self.user, edx_client)
        self.assert_enrollments_in_db(now, course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

        models.CachedEnrollment.objects.filter(user=self.user).update(last_request=six_hour_1_min_ago)

        # Assert that this second call updates the database
        assert mocked_get_student_enrollments.call_count == 1
        api.get_student_enrollments(self.user, edx_client)
        assert mocked_get_student_enrollments.call_count == 2
        self.assert_enrollments_in_db(now, course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

    def test_update(self):
        """
        Ensure that we replace existing data.
        """
        now = datetime.now(tz=pytz.utc)
        six_hour_1_min_ago = now - timedelta(minutes=1, hours=6)

        mocked_get_student_enrollments = MagicMock(
            return_value=self.enrollments
        )
        edx_client = MagicMock(
            enrollments=MagicMock(
                get_student_enrollments=mocked_get_student_enrollments
            )
        )

        course_ids = self.enrollments.get_enrolled_course_ids()

        # Call get_student_enrollments once to populate database
        api.get_student_enrollments(self.user, edx_client)
        self.assert_enrollments_in_db(now, course_ids)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

        models.CachedEnrollment.objects.filter(user=self.user).update(last_request=six_hour_1_min_ago)

        # update enrollment
        first_enrollment = list(self.enrollments.enrollments.values())[0]
        enrollment_data = dict(first_enrollment.json)
        enrollment_data['course_details']['mode'] = 'modified'
        updated_enrollments = Enrollments([enrollment_data])
        course_ids = [enrollment_data['course_details']['course_id']]

        # Get enrollments
        mocked_get_student_enrollments = MagicMock(
            return_value=updated_enrollments
        )
        edx_client = MagicMock(
            enrollments=MagicMock(
                get_student_enrollments=mocked_get_student_enrollments
            )
        )
        api.get_student_enrollments(self.user, edx_client)
        assert mocked_get_student_enrollments.call_count == 1
        self.assert_enrollments_in_db(now, course_ids, updated_enrollments)
        self.assert_null_entry_for_certs_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )


class CachedCurrentGradesTests(ESTestCase):
    """Tests get_student_current_grades"""

    @classmethod
    def setUpTestData(cls):
        """
        Set up current grades
        """
        with open(os.path.join(os.path.dirname(__file__),
                               'fixtures/current_grades.json')) as file_obj:
            grades_json = json.loads(file_obj.read())

        cls.current_grades = CurrentGrades([CurrentGrade(grade_json) for grade_json in grades_json])
        all_runs = []
        cls.all_course_run_ids = []
        for cur_grade in cls.current_grades.all_current_grades:
            all_runs.append(CourseRunFactory.create(edx_course_key=cur_grade.course_id))
            cls.all_course_run_ids.append(cur_grade.course_id)
        # add an extra course_run not coming from certificates
        fake_course_id = 'foo+cert+key'
        all_runs.append(CourseRunFactory.create(edx_course_key=fake_course_id))
        cls.all_course_run_ids.append(fake_course_id)

        for run in all_runs:
            run.course.program.live = True
            run.course.program.save()

        cls.user = UserFactory.create()

    def assert_in_db(self, expected_timestamp, course_ids, current_grades=None):
        """
        Check that self.current_grades matches what's in the database
        """
        if current_grades is None:
            current_grades = self.current_grades

        one_minute_before = expected_timestamp - timedelta(minutes=1)
        one_minute_after = expected_timestamp + timedelta(minutes=1)

        current_grades_list = models.CachedCurrentGrade.objects.filter(
            user=self.user,
            course_run__edx_course_key__in=course_ids,
        ).exclude(data__isnull=True)
        assert current_grades_list.count() == len(course_ids)
        for current_grade_obj in current_grades_list:
            assert one_minute_before < current_grade_obj.last_request < one_minute_after
            current_grade = current_grades.get_current_grade(current_grade_obj.course_run.edx_course_key)
            assert current_grade.json == current_grade_obj.data

    def assert_null_entry_in_db(self, expected_timestamp, course_ids):
        """
        Checks that the entry in the cache is null for the given course IDs.
        """
        one_minute_before = expected_timestamp - timedelta(minutes=1)
        one_minute_after = expected_timestamp + timedelta(minutes=1)

        current_grades_list = models.CachedCurrentGrade.objects.filter(
            user=self.user,
            course_run__edx_course_key__in=course_ids,
            data__isnull=True,
        )
        assert current_grades_list.count() == len(course_ids)
        for current_grade_obj in current_grades_list:
            assert one_minute_before < current_grade_obj.last_request < one_minute_after

    def test_new(self):
        """
        Get new student current grades from edX
        """
        mocked_get_student_curgrade = MagicMock(
            return_value=self.current_grades
        )
        edx_client = MagicMock(
            current_grades=MagicMock(
                get_student_current_grades=mocked_get_student_curgrade
            )
        )

        username = 'fake_username'
        course_ids = list(self.current_grades.all_course_ids)
        with patch('dashboard.api.get_social_username', autospec=True, return_value=username):
            ret = api.get_student_current_grades(self.user, edx_client)
        # Test that the current grades object returned by the edx_api function is exactly the same
        # object as what our function tests
        assert ret is self.current_grades
        assert mocked_get_student_curgrade.call_args[0] == (username, self.all_course_run_ids)
        now = datetime.now(tz=pytz.utc)
        self.assert_in_db(now, course_ids)
        # assert that all the course run that not have a verified
        # certificate have a null entry in the cache DB
        self.assert_null_entry_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

    def test_cached(self):
        """
        If our copy of the current grades data is in the database, don't fetch from edX
        """
        now = datetime.now(tz=pytz.utc)
        four_minutes_ago = now - timedelta(minutes=4)

        mocked_get_student_curgrade = MagicMock(
            return_value=self.current_grades
        )
        edx_client = MagicMock(
            current_grades=MagicMock(
                get_student_current_grades=mocked_get_student_curgrade
            )
        )

        course_ids = list(self.current_grades.all_course_ids)

        # Call get_student_current_grades once to populate database
        api.get_student_current_grades(self.user, edx_client)
        self.assert_in_db(now, course_ids)
        self.assert_null_entry_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

        models.CachedCurrentGrade.objects.filter(user=self.user).update(last_request=four_minutes_ago)

        # Assert that this second call doesn't update the database
        assert mocked_get_student_curgrade.call_count == 1
        api.get_student_current_grades(self.user, edx_client)
        assert mocked_get_student_curgrade.call_count == 1
        self.assert_in_db(four_minutes_ago, course_ids)
        self.assert_null_entry_in_db(
            four_minutes_ago,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

    def test_expired(self):
        """
        If our copy of the current grades data is expired, fetch from edX again
        """
        now = datetime.now(tz=pytz.utc)
        one_hour_1_min_ago = now - timedelta(minutes=1, hours=1)

        mocked_get_student_curgrade = MagicMock(
            return_value=self.current_grades
        )
        edx_client = MagicMock(
            current_grades=MagicMock(
                get_student_current_grades=mocked_get_student_curgrade
            )
        )

        course_ids = list(self.current_grades.all_course_ids)

        # Call get_student_enrollments once to populate database
        api.get_student_current_grades(self.user, edx_client)
        self.assert_in_db(now, course_ids)
        self.assert_null_entry_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

        models.CachedCurrentGrade.objects.filter(user=self.user).update(last_request=one_hour_1_min_ago)

        # Assert that this second call updates the database
        assert mocked_get_student_curgrade.call_count == 1
        api.get_student_current_grades(self.user, edx_client)
        assert mocked_get_student_curgrade.call_count == 2
        self.assert_in_db(now, course_ids)
        self.assert_null_entry_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

    def test_update(self):
        """
        Ensure that we replace existing data.
        """
        now = datetime.now(tz=pytz.utc)
        one_hour_1_min_ago = now - timedelta(minutes=1, hours=1)

        mocked_get_student_curgrade = MagicMock(
            return_value=self.current_grades
        )
        edx_client = MagicMock(
            current_grades=MagicMock(
                get_student_current_grades=mocked_get_student_curgrade
            )
        )

        course_ids = list(self.current_grades.all_course_ids)

        # Call get_student_enrollments once to populate database
        api.get_student_current_grades(self.user, edx_client)
        self.assert_in_db(now, course_ids)
        self.assert_null_entry_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )

        models.CachedCurrentGrade.objects.filter(user=self.user).update(last_request=one_hour_1_min_ago)

        # update current grade
        first_current_grade = list(self.current_grades.all_current_grades)[0]
        grade_data = dict(first_current_grade.json)
        grade_data['letter_grade'] = 'Passsss'
        updated_grades = CurrentGrades([CurrentGrade(grade_data)])
        course_ids = [grade_data['course_key']]

        # Get enrollments
        mocked_get_student_curgrade = MagicMock(
            return_value=updated_grades
        )
        edx_client = MagicMock(
            current_grades=MagicMock(
                get_student_current_grades=mocked_get_student_curgrade
            )
        )

        api.get_student_current_grades(self.user, edx_client)
        assert mocked_get_student_curgrade.call_count == 1
        self.assert_in_db(now, course_ids, updated_grades)
        self.assert_null_entry_in_db(
            now,
            list(set(self.all_course_run_ids).difference(set(course_ids)))
        )
