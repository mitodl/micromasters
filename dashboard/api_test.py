"""
Tests for the dashboard api functions
"""
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytz
from django.core.exceptions import ImproperlyConfigured

from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
)
from dashboard import (
    api,
    models,
)
from dashboard.api_edx_cache import CachedEdxDataApi
from dashboard.factories import CachedEnrollmentFactory, CachedCurrentGradeFactory, UserCacheRefreshTimeFactory
from dashboard.utils import MMTrack
from micromasters.factories import UserFactory
from micromasters.utils import is_subset_dict
from search.base import ESTestCase


# pylint: disable=too-many-lines
class StatusTest(ESTestCase):
    """
    Tests for the different status classes
    """
    # pylint: disable= no-self-use
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
            'enrollment_url': crun.enrollment_url,
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
                'fuzzy_start_date': crun.fuzzy_start_date,
                'enrollment_url': crun.enrollment_url,
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
        assert run_status.status == api.CourseRunStatus.MISSED_DEADLINE

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
            edx_key="course-v1:edX+DemoX+Demo_Course_2",
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
        # one for the one that is past
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, None, position=1)
        # one for the course that is current run
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, None, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_not_enrolled_not_passed_not_offered(self, mock_format):
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

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_grade(self, mock_format):
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
                api.CourseRunStatus.NOT_ENROLLED, self.course_run, api.CourseRunStatus.CHECK_IF_PASSED),
        ):
            self.assert_course_equal(
                self.course,
                api.get_info_for_course(self.course, self.mmtrack)
            )
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, self.mmtrack, position=1)
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, self.mmtrack, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_missed_deadline(self, mock_format):
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
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.WILL_ATTEND, None, position=1)

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


class UserProgramInfoIntegrationTest(ESTestCase):
    """Integration tests for get_user_program_info"""
    @classmethod
    def setUpTestData(cls):
        super(UserProgramInfoIntegrationTest, cls).setUpTestData()
        cls.user = UserFactory()
        # create the programs
        cls.program_non_fin_aid = ProgramFactory.create(full=True, live=True)
        cls.program_fin_aid = ProgramFactory.create(full=True, live=True, financial_aid_availability=True)
        cls.program_unenrolled = ProgramFactory.create(full=True, live=True)
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

        assert len(result) == 2
        for i in range(2):
            expected = {
                "id": self.expected_programs[i].id,
                "description": self.expected_programs[i].description,
                "title": self.expected_programs[i].title,
                "financial_aid_availability": self.expected_programs[i].financial_aid_availability,
            }
            assert is_subset_dict(expected, result[i])

    def test_past_course_runs(self):
        """Test that past course runs are returned in the API results"""
        # Set a course run to be failed
        now = datetime.now(tz=pytz.UTC)
        program = self.program_non_fin_aid
        course = program.course_set.first()

        failed_course_run = course.courserun_set.first()
        failed_course_run.end_date = now - timedelta(days=1)
        failed_course_run.save()
        CachedEnrollmentFactory.create(user=self.user, course_run=failed_course_run)
        CachedCurrentGradeFactory.create(user=self.user, course_run=failed_course_run)

        # Create a course run previous to that one, and set it to be failed as well
        previous_failed_course_run = CourseRunFactory.create(
            course=course,
            end_date=failed_course_run.end_date - timedelta(days=30)
        )
        CachedEnrollmentFactory.create(user=self.user, course_run=previous_failed_course_run)
        CachedCurrentGradeFactory.create(user=self.user, course_run=previous_failed_course_run)

        # set the last access for the cache
        UserCacheRefreshTimeFactory.create(
            user=self.user,
            enrollment=now,
            certificate=now,
            current_grade=now,
        )

        result = api.get_user_program_info(self.user, self.edx_client)
        assert len(result) > 0
        assert len(result[0]['courses']) > 0
        assert len(result[0]['courses'][0]['runs']) == 2
        assert all([run['status'] == api.CourseStatus.NOT_PASSED for run in result[0]['courses'][0]['runs']])


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
