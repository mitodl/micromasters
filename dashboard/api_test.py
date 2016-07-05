"""
Tests for the dashboard api functions
"""
import json
import os
from datetime import datetime, timedelta
from mock import patch, MagicMock

import pytz
from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase

from edx_api.certificates.models import Certificate, Certificates
from edx_api.enrollments.models import Enrollments

from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
)
from dashboard import api
from profiles.factories import UserFactory


class StatusTest(TestCase):
    """
    Tests for the different status classes
    """
    # pylint: disable= no-self-use
    def test_course_status(self):
        """test for CourseStatus"""
        for attr in ('PASSED', 'NOT_PASSED', 'CURRENT_GRADE', 'UPGRADE', 'NOT_OFFERED', 'OFFERED',):
            assert hasattr(api.CourseStatus, attr)

    def test_course_status_all_statuses(self):
        """test for CourseStatus.all_statuses"""
        all_constants = [value for name, value in vars(api.CourseStatus).items()
                         if not name.startswith('_') and isinstance(value, str)]
        assert sorted(all_constants) == sorted(api.CourseStatus.all_statuses())

    def test_course_run_status(self):
        """test for CourseRunStatus"""
        for attr in ('NOT_ENROLLED', 'GRADE', 'READ_CERT', 'WILL_ATTEND', 'UPGRADE', 'NOT_PASSED'):
            assert hasattr(api.CourseRunStatus, attr)

    def test_course_run_user_status(self):
        """test for CourseRunUserStatus"""
        ustat = api.CourseRunUserStatus(
            status='status',
            course_run='run',
            enrollment_for_course='enroll'
        )
        assert ustat.status == 'status'
        assert ustat.course_run == 'run'
        assert ustat.enrollment_for_course == 'enroll'

    def test_course_run_user_status_repr(self):
        """test for CourseRunUserStatus __repr__"""
        mock_run = MagicMock()
        mock_run.title = 'run'
        ustat = api.CourseRunUserStatus(
            status='status',
            course_run=mock_run,
            enrollment_for_course='enroll'
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


class CourseMixin(TestCase):
    """Base class for APIs tests"""

    @classmethod
    def setUpTestData(cls):
        super(CourseMixin, cls).setUpTestData()
        cls.course = CourseFactory.create(title="Title")

        with open(os.path.join(os.path.dirname(__file__),
                               'fixtures/certificates.json')) as file_obj:
            cls.certificates_json = json.loads(file_obj.read())

        cls.certificates = Certificates(
            [Certificate(cert_json) for cert_json in cls.certificates_json])

    def setUp(self):
        super(CourseMixin, self).setUp()
        self.now = datetime.now(pytz.utc)

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


class FormatRunTest(CourseMixin):
    """Tests for the format_courserun_for_dashboard function"""

    def test_format_run_no_run(self):
        """Test for format_courserun_for_dashboard if there is no run"""
        self.assertIsNone(
            api.format_courserun_for_dashboard(None, api.CourseStatus.PASSED)
        )

    def test_format_run(self):
        """Test for format_courserun_for_dashboard with passed run and position"""
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )
        self.assertEqual(
            api.format_courserun_for_dashboard(crun, api.CourseStatus.PASSED),
            {
                'title': crun.title,
                'status': api.CourseStatus.PASSED,
                'id': crun.pk,
                'course_id': crun.edx_course_key,
                'position': 1,
            }
        )

        # with different position
        self.assertEqual(
            api.format_courserun_for_dashboard(crun, api.CourseStatus.PASSED, position=56),
            {
                'title': crun.title,
                'status': api.CourseStatus.PASSED,
                'id': crun.pk,
                'course_id': crun.edx_course_key,
                'position': 56,
            }
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
            api.format_courserun_for_dashboard(crun, api.CourseStatus.OFFERED),
            {
                'title': crun.title,
                'status': api.CourseStatus.OFFERED,
                'id': crun.pk,
                'course_id': crun.edx_course_key,
                'enrollment_start_date': crun.enrollment_start,
                'fuzzy_enrollment_start_date': crun.fuzzy_enrollment_start_date,
                'position': 1,
            }
        )

        # test that a weird status raises here
        with self.assertRaises(ImproperlyConfigured):
            api.format_courserun_for_dashboard(crun, 'foo_status')

    def test_format_run_no_certificate(self):
        """Test for format_courserun_for_dashboard with status PASSED and no certificate"""
        crun = self.create_run(
            edx_key="course-v1:edX+DemoX+Demo_Course",
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )
        self.assertEqual(
            api.format_courserun_for_dashboard(
                crun, api.CourseStatus.PASSED, certificate=None),
            {
                'title': crun.title,
                'status': api.CourseStatus.PASSED,
                'id': crun.pk,
                'course_id': crun.edx_course_key,
                'position': 1,
            }
        )

    def test_format_run_certificate(self):
        """Test for format_courserun_for_dashboard with status PASSED and certificate"""
        crun = self.create_run(
            edx_key="course-v1:edX+DemoX+Demo_Course",
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
        )
        cert = self.certificates.get_verified_cert("course-v1:edX+DemoX+Demo_Course")
        assert cert is not None
        self.assertEqual(
            api.format_courserun_for_dashboard(
                crun, api.CourseStatus.PASSED, certificate=cert),
            {
                'title': crun.title,
                'status': api.CourseStatus.PASSED,
                'id': crun.pk,
                'course_id': crun.edx_course_key,
                'grade': cert.grade,
                'certificate_url': cert.download_url,
                'position': 1,
            }
        )


class CourseRunTest(CourseMixin):
    """Tests for get_status_for_courserun"""

    @classmethod
    def setUpTestData(cls):
        super(CourseRunTest, cls).setUpTestData()
        with open(os.path.join(os.path.dirname(__file__),
                               'fixtures/user_enrollments.json')) as file_obj:
            cls.enrollments_json = json.loads(file_obj.read())

        cls.enrollments = Enrollments(cls.enrollments_json)
        cls.now = datetime.now(pytz.utc)

    def test_status_for_run_not_enrolled(self):
        """test for get_status_for_courserun for course without enrollment"""
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            edx_key='foo_edx_key'
        )
        run_status = api.get_status_for_courserun(crun, self.enrollments)
        assert isinstance(run_status, api.CourseRunUserStatus)
        assert run_status.status == api.CourseRunStatus.NOT_ENROLLED
        assert run_status.course_run == crun
        assert run_status.enrollment_for_course is None

    def test_verified_grade(self):
        """test for get_status_for_courserun for an enrolled and verified current course"""
        # create a run that is current
        crun = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        run_status = api.get_status_for_courserun(crun, self.enrollments)
        assert run_status.status == api.CourseRunStatus.GRADE
        assert run_status.course_run == crun
        assert (run_status.enrollment_for_course ==
                self.enrollments.get_enrollment_for_course("course-v1:edX+DemoX+Demo_Course"))

    def test_verified_read_cert(self):
        """test for get_status_for_courserun for a finished course"""
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        run_status = api.get_status_for_courserun(crun, self.enrollments)
        assert run_status.status == api.CourseRunStatus.READ_CERT
        assert run_status.course_run == crun
        assert (run_status.enrollment_for_course ==
                self.enrollments.get_enrollment_for_course("course-v1:edX+DemoX+Demo_Course"))

    def test_verified_read_will_attend(self):
        """test for get_status_for_courserun for an enrolled and verified future course"""
        # create a run that is future
        crun = self.create_run(
            start=self.now+timedelta(weeks=52),
            end=self.now+timedelta(weeks=62),
            enr_start=self.now+timedelta(weeks=40),
            enr_end=self.now+timedelta(weeks=50),
            edx_key="course-v1:edX+DemoX+Demo_Course"
        )
        run_status = api.get_status_for_courserun(crun, self.enrollments)
        assert run_status.status == api.CourseRunStatus.WILL_ATTEND
        assert run_status.course_run == crun
        assert (run_status.enrollment_for_course ==
                self.enrollments.get_enrollment_for_course("course-v1:edX+DemoX+Demo_Course"))

    def test_not_verified_upgrade(self):
        """test for get_status_for_courserun for present and future course with audit enrollment"""
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
        run_status = api.get_status_for_courserun(future_run, self.enrollments)
        assert run_status.status == api.CourseRunStatus.UPGRADE
        assert run_status.course_run == future_run
        assert (run_status.enrollment_for_course ==
                self.enrollments.get_enrollment_for_course("course-v1:MITx+8.MechCX+2014_T1"))
        run_status = api.get_status_for_courserun(current_run, self.enrollments)
        assert run_status.status == api.CourseRunStatus.UPGRADE
        assert run_status.course_run == current_run
        assert (run_status.enrollment_for_course ==
                self.enrollments.get_enrollment_for_course("course-v1:MITx+8.MechCX+2014_T1"))

    def test_not_verified_upgradable(self):
        """test for get_status_for_courserun with check if course can be upgraded to verified"""
        # create a run that is current with upgrade deadline None
        current_run = self.create_run(
            start=self.now-timedelta(weeks=1),
            end=self.now+timedelta(weeks=2),
            enr_start=self.now-timedelta(weeks=10),
            enr_end=self.now+timedelta(weeks=1),
            upgrade_deadline=None,
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        run_status = api.get_status_for_courserun(current_run, self.enrollments)
        assert run_status.status == api.CourseRunStatus.UPGRADE

        # modify the run to have an upgrade deadline in the future
        current_run.upgrade_deadline = self.now+timedelta(weeks=1)
        current_run.save()
        run_status = api.get_status_for_courserun(current_run, self.enrollments)
        assert run_status.status == api.CourseRunStatus.UPGRADE

        # modify the run to have an upgrade deadline in the past
        current_run.upgrade_deadline = self.now-timedelta(weeks=1)
        current_run.save()
        run_status = api.get_status_for_courserun(current_run, self.enrollments)
        assert run_status.status == api.CourseRunStatus.NOT_PASSED

    def test_not_verified_not_passed(self):
        """test for get_status_for_courserun for course not upgraded to verified but that is past"""
        # create a run that is past
        crun = self.create_run(
            start=self.now-timedelta(weeks=52),
            end=self.now-timedelta(weeks=45),
            enr_start=self.now-timedelta(weeks=62),
            enr_end=self.now-timedelta(weeks=53),
            edx_key="course-v1:MITx+8.MechCX+2014_T1"
        )
        run_status = api.get_status_for_courserun(crun, self.enrollments)
        assert run_status.status == api.CourseRunStatus.NOT_PASSED
        assert run_status.course_run == crun
        assert (run_status.enrollment_for_course ==
                self.enrollments.get_enrollment_for_course("course-v1:MITx+8.MechCX+2014_T1"))


class InfoCourseTest(CourseMixin):
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

    def assert_course_equal(self, course, status, course_data_from_call):
        """Helper to format the course info"""
        expected_data = {
            "id": course.pk,
            "title": course.title,
            "position_in_program": course.position_in_program,
            "description": course.description,
            "prerequisites": course.prerequisites,
            "status": status,
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
            api.CourseStatus.NOT_OFFERED,
            api.get_info_for_course(self.user, self.course_noruns, None, None)
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
                api.CourseStatus.OFFERED,
                api.get_info_for_course(self.user, self.course, None, None)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.OFFERED, position=1)

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
                api.CourseStatus.OFFERED,
                api.get_info_for_course(self.user, self.course, None, None)
            )
        # the mock object has been called 2 times
        # one for the course that is current run
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, position=1)
        # one for the one that is past
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, position=2)

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
                api.CourseStatus.NOT_OFFERED,
                api.get_info_for_course(self.user, self.course, None, None)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.NOT_PASSED, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_grade(self, mock_format):
        """test for get_info_for_course for course with a course current and another not passed"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.GRADE, self.course_run, api.CourseRunStatus.NOT_PASSED),
        ):
            self.assert_course_equal(
                self.course,
                api.CourseStatus.CURRENT_GRADE,
                api.get_info_for_course(self.user, self.course, None, None)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.CURRENT_GRADE, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_read_cert_no_verified_cert(self, mock_format):
        """
        test for get_info_for_course in case there is not verified certificate for the course
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.READ_CERT, self.course_run, api.CourseRunStatus.NOT_PASSED),
        ):
            self.assert_course_equal(
                self.course,
                api.CourseStatus.OFFERED,
                api.get_info_for_course(self.user, self.course, None, self.certificates)
            )
        mock_format.assert_any_call(self.course_run, api.CourseStatus.OFFERED, position=1)
        mock_format.assert_any_call(self.course_run_ver, api.CourseStatus.NOT_PASSED, position=2)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_read_cert_no_verified_cert_no_next(self, mock_format):
        """
        test for get_info_for_course in case there is not verified certificate for the course
        and there is no next run
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.READ_CERT, self.course_run_past, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course_no_next_run,
                api.CourseStatus.NOT_OFFERED,
                api.get_info_for_course(self.user, self.course_no_next_run, None, self.certificates)
            )
        mock_format.assert_called_once_with(self.course_run_past, api.CourseStatus.NOT_PASSED, position=1)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_read_cert_with_ver_cert(self, mock_format):
        """
        test for get_info_for_course in case there is a certificate for the course
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.READ_CERT, self.course_run_ver, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.CourseStatus.PASSED,
                api.get_info_for_course(self.user, self.course, None, self.certificates)
            )
        mock_format.assert_called_once_with(
            self.course_run_ver,
            api.CourseStatus.PASSED,
            self.certificates.get_verified_cert(self.course_run_ver.edx_course_key),
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
                api.CourseStatus.CURRENT_GRADE,
                api.get_info_for_course(self.user, self.course, None, None)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.CURRENT_GRADE, position=1)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_upgrade(self, mock_format):
        """test for get_info_for_course for course with a run that needs to be upgraded"""
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.UPGRADE, self.course_run, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.CourseStatus.UPGRADE,
                api.get_info_for_course(self.user, self.course, None, None)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.UPGRADE, position=1)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_default_should_not_happen(self, mock_format):
        """
        test for get_info_for_course for course with a run with an
        unespected state but that can be offered
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                'status-that-we-should-never-have', self.course_run, api.CourseRunStatus.NOT_ENROLLED),
        ):
            self.assert_course_equal(
                self.course,
                api.CourseStatus.OFFERED,
                api.get_info_for_course(self.user, self.course, None, None)
            )
        mock_format.assert_called_once_with(self.course_run, api.CourseStatus.OFFERED, position=1)

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
                api.CourseStatus.NOT_OFFERED,
                api.get_info_for_course(self.user, self.course_no_next_run, None, None)
            )
        mock_format.assert_called_once_with(self.course_run_past, api.CourseStatus.NOT_PASSED, position=1)

    @patch('dashboard.api.format_courserun_for_dashboard', autospec=True)
    def test_info_read_cert_for_all_no_next(self, mock_format):
        """
        test for get_info_for_course in case the less recent course has a read cert status
        """
        with patch(
            'dashboard.api.get_status_for_courserun',
            autospec=True,
            side_effect=self.get_mock_run_status_func(
                api.CourseRunStatus.NOT_PASSED, self.course_run_past, api.CourseRunStatus.READ_CERT),
        ):
            self.assert_course_equal(
                self.course_no_next_run,
                api.CourseStatus.NOT_OFFERED,
                api.get_info_for_course(self.user, self.course_no_next_run, None, self.certificates)
            )
        mock_format.assert_any_call(self.course_run_past, api.CourseStatus.NOT_PASSED, position=1)
        mock_format.assert_any_call(
            self.course_run_past_ver,
            api.CourseStatus.PASSED,
            self.certificates.get_verified_cert(self.course_run_past_ver.edx_course_key),
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
                api.CourseStatus.OFFERED,
                api.get_info_for_course(self.user, run1.course, None, None)
            )
        mock_format.assert_called_once_with(run1, api.CourseStatus.OFFERED, position=1)


class InfoProgramTest(TestCase):
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

    @patch('dashboard.api.get_info_for_course', autospec=True)
    def test_program(self, mock_info_course):
        """Test happy path"""
        mock_info_course.return_value = {'position_in_program': 1}
        res = api.get_info_for_program(
            self.program, self.user, {'enrollments': None}, {'certificates': None})
        for course in self.courses:
            mock_info_course.assert_any_call(
                self.user, course, {'enrollments': None}, {'certificates': None})
        expected_data = {
            "id": self.program.pk,
            "description": self.program.description,
            "title": self.program.title,
            "courses": [{'position_in_program': 1}, {'position_in_program': 1}]
        }
        self.assertEqual(res, expected_data)

    @patch('dashboard.api.get_info_for_course', autospec=True)
    def test_program_no_courses(self, mock_info_course):
        """Test program with no courses"""
        res = api.get_info_for_program(
            self.program_no_courses, self.user, {'enrollments': None}, {'certificates': None})
        assert mock_info_course.called is False
        expected_data = {
            "id": self.program_no_courses.pk,
            "description": self.program_no_courses.description,
            "title": self.program_no_courses.title,
            "courses": []
        }
        self.assertEqual(res, expected_data)
