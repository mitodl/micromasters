"""
Tests for the dashboard APIs functions that deal with the edx cached data
"""

from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytz
from edx_api.certificates.models import Certificate, Certificates
from edx_api.enrollments.models import Enrollment, Enrollments
from edx_api.grades.models import CurrentGrade, CurrentGrades

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from dashboard import models
from dashboard.api_edx_cache import CachedEdxUserData, CachedEdxDataApi
from dashboard.factories import (
    CachedEnrollmentFactory,
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    UserCacheRefreshTimeFactory,
)
from dashboard.models import (
    UserCacheRefreshTime,
    CachedEnrollment,
)
from micromasters.factories import UserFactory
from micromasters.utils import load_json_from_file
from search.base import ESTestCase


# pylint: disable=no-self-use


class CachedEdxUserDataTests(ESTestCase):
    """
    Tests for the CachedEdxUserData class
    """

    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory.create()
        # Create Programs, Courses, CourseRuns...
        cls.p1_course_run_keys = ['p1_course_run']
        cls.p2_course_run_keys = ['p2_course_run_1', 'p2_course_run_2']
        cls.p1_course_run = CourseRunFactory.create(edx_course_key=cls.p1_course_run_keys[0])
        p2 = ProgramFactory.create(full=True)
        first_course = p2.course_set.first()
        extra_course = CourseFactory.create(program=p2)
        cls.p2_course_run_1 = CourseRunFactory.create(course=first_course, edx_course_key=cls.p2_course_run_keys[0])
        cls.p2_course_run_2 = CourseRunFactory.create(course=extra_course, edx_course_key=cls.p2_course_run_keys[1])
        all_course_runs = [cls.p1_course_run, cls.p2_course_run_1, cls.p2_course_run_2]
        # Create cached edX data
        cls.enrollments = [
            CachedEnrollmentFactory.create(user=cls.user, course_run=course_run) for course_run in all_course_runs
        ]
        cls.certificates = [
            CachedCertificateFactory.create(user=cls.user, course_run=course_run) for course_run in all_course_runs
        ]
        cls.current_grades = [
            CachedCurrentGradeFactory.create(user=cls.user, course_run=course_run) for course_run in all_course_runs
        ]

    def assert_edx_data_has_given_ids(self, edx_user_data, ids):
        """Asserts that all edX object course id sets match the given list of ids"""
        assert sorted(edx_user_data.enrollments.get_enrolled_course_ids()) == ids
        assert sorted(edx_user_data.certificates.all_courses_verified_certs) == ids
        assert sorted(edx_user_data.current_grades.all_course_ids) == ids

    def test_edx_data_fetch_and_set(self):
        """Test that a user's edX data is properly fetched and set onto object properties"""
        edx_user_data = CachedEdxUserData(self.user)
        assert isinstance(edx_user_data.enrollments, Enrollments)
        assert isinstance(edx_user_data.certificates, Certificates)
        assert isinstance(edx_user_data.current_grades, CurrentGrades)
        self.assert_edx_data_has_given_ids(edx_user_data, self.p1_course_run_keys + self.p2_course_run_keys)

    def test_edx_data_with_program(self):
        """Test that a user's edX data is filtered by program when specified"""
        p1_course_run_program = self.p1_course_run.course.program
        edx_user_data = CachedEdxUserData(self.user, program=p1_course_run_program)
        self.assert_edx_data_has_given_ids(edx_user_data, self.p1_course_run_keys)
        p2_course_run_program = self.p2_course_run_1.course.program
        edx_user_data = CachedEdxUserData(self.user, program=p2_course_run_program)
        self.assert_edx_data_has_given_ids(edx_user_data, self.p2_course_run_keys)

    def test_raw_data_fetch_and_set(self):
        """Test that a user's raw edX data is properly fetched and set onto object properties"""
        edx_user_data = CachedEdxUserData(self.user, include_raw_data=True)
        assert edx_user_data.raw_enrollments == [obj.data for obj in self.enrollments]
        assert edx_user_data.raw_certificates == [obj.data for obj in self.certificates]
        assert edx_user_data.raw_current_grades == [obj.data for obj in self.current_grades]


class CachedEdxDataApiTests(ESTestCase):
    """
    Tests for the CachedEdxDataApi class
    """

    @classmethod
    def setUpTestData(cls):
        """
        Set up data
        """
        cls.user = UserFactory.create()

        certificates_json = load_json_from_file('dashboard/fixtures/certificates.json')
        cls.certificates = Certificates([Certificate(cert_json) for cert_json in certificates_json])

        enrollments_json = load_json_from_file('dashboard/fixtures/user_enrollments.json')
        cls.enrollments = Enrollments(enrollments_json)

        # the grades need to have all the same usernames
        current_grades_json = []
        for grade in load_json_from_file('dashboard/fixtures/current_grades.json'):
            grade.update({'username': cls.user.username})
            current_grades_json.append(grade)
        cls.current_grades = CurrentGrades([CurrentGrade(grade_json) for grade_json in current_grades_json])

        cls.certificates_ids = set(cls.certificates.all_courses_certs)
        cls.verified_certificates_ids = set(cls.certificates.all_courses_verified_certs)
        cls.enrollment_ids = set(cls.enrollments.get_enrolled_course_ids())
        cls.grades_ids = set(cls.current_grades.all_course_ids)
        cls.all_course_run_ids = list(
            cls.certificates_ids | cls.enrollment_ids | cls.grades_ids
        )
        cls.all_runs = []
        for course_id in cls.all_course_run_ids:
            cls.all_runs.append(CourseRunFactory.create(
                edx_course_key=course_id,
                course__program__live=True,
            ))

        cls.edx_client = MagicMock()
        cls.edx_client.enrollments.get_student_enrollments.return_value = cls.enrollments
        cls.edx_client.certificates.get_student_certificates.return_value = cls.certificates
        cls.edx_client.current_grades.get_student_current_grades.return_value = cls.current_grades

    def assert_cache_in_db(self, enrollment_keys=None, certificate_keys=None, grades_keys=None):
        """
        Helper function to assert the course keys in the database cache
        """
        enrollment_keys = enrollment_keys or []
        certificate_keys = certificate_keys or []
        grades_keys = grades_keys or []
        enrollments = CachedEdxDataApi.get_cached_edx_data(self.user, CachedEdxDataApi.ENROLLMENT)
        certificates = CachedEdxDataApi.get_cached_edx_data(self.user, CachedEdxDataApi.CERTIFICATE)
        grades = CachedEdxDataApi.get_cached_edx_data(self.user, CachedEdxDataApi.CURRENT_GRADE)
        assert sorted(list(enrollments.enrollments.keys())) == sorted(enrollment_keys)
        assert sorted(list(certificates.certificates.keys())) == sorted(certificate_keys)
        assert sorted(list(grades.current_grades.keys())) == sorted(grades_keys)

    def test_constants(self):
        """Tests class constants"""
        assert CachedEdxDataApi.SUPPORTED_CACHES == (
            CachedEdxDataApi.ENROLLMENT,
            CachedEdxDataApi.CERTIFICATE,
            CachedEdxDataApi.CURRENT_GRADE,
        )
        assert CachedEdxDataApi.CACHED_EDX_MODELS == {
            CachedEdxDataApi.ENROLLMENT: models.CachedEnrollment,
            CachedEdxDataApi.CERTIFICATE: models.CachedCertificate,
            CachedEdxDataApi.CURRENT_GRADE: models.CachedCurrentGrade,
        }
        assert CachedEdxDataApi.CACHE_EXPIRATION_DELTAS == {
            CachedEdxDataApi.ENROLLMENT:  timedelta(minutes=5),
            CachedEdxDataApi.CERTIFICATE: timedelta(hours=6),
            CachedEdxDataApi.CURRENT_GRADE: timedelta(hours=1),
        }

    def test_get_cached_edx_data(self):
        """
        Test for get_cached_edx_data
        """
        with self.assertRaises(ValueError):
            CachedEdxDataApi.get_cached_edx_data(self.user, 'footype')

        self.assert_cache_in_db()
        for run in self.all_runs:
            CachedEnrollmentFactory.create(user=self.user, course_run=run)
            CachedCertificateFactory.create(user=self.user, course_run=run)
            CachedCurrentGradeFactory.create(user=self.user, course_run=run)
        self.assert_cache_in_db(self.all_course_run_ids, self.all_course_run_ids, self.all_course_run_ids)

    def test_update_cache_last_access(self):
        """Test for update_cache_last_access"""
        with self.assertRaises(ValueError):
            CachedEdxDataApi.update_cache_last_access(self.user, 'footype')
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False

        CachedEdxDataApi.update_cache_last_access(self.user, CachedEdxDataApi.ENROLLMENT)
        cache_time = UserCacheRefreshTime.objects.get(user=self.user)
        assert cache_time.enrollment <= datetime.now(tz=pytz.UTC)
        assert cache_time.certificate is None
        assert cache_time.current_grade is None

        old_timestamp = datetime.now(tz=pytz.UTC) - timedelta(days=1)
        CachedEdxDataApi.update_cache_last_access(self.user, CachedEdxDataApi.ENROLLMENT, old_timestamp)
        cache_time.refresh_from_db()
        assert cache_time.enrollment == old_timestamp

    def test_is_cache_fresh(self):
        """Test for is_cache_fresh"""
        with self.assertRaises(ValueError):
            CachedEdxDataApi.is_cache_fresh(self.user, 'footype')
        # if there is no entry in the table, the cache is not fresh
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            assert CachedEdxDataApi.is_cache_fresh(self.user, cache_type) is False
        now = datetime.now(tz=pytz.UTC)
        user_cache = UserCacheRefreshTimeFactory.create(
            user=self.user,
            enrollment=now,
            certificate=now,
            current_grade=now,
        )
        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            assert CachedEdxDataApi.is_cache_fresh(self.user, cache_type) is True
        # moving back the timestamp of one day, makes the cache not fresh again
        yesterday = now - timedelta(days=1)
        user_cache.enrollment = yesterday
        user_cache.certificate = yesterday
        user_cache.current_grade = yesterday
        user_cache.save()
        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            assert CachedEdxDataApi.is_cache_fresh(self.user, cache_type) is False

    @patch('search.tasks.index_users', autospec=True)
    def test_update_cached_enrollment(self, mocked_index):
        """Test for update_cached_enrollment"""
        course_id = list(self.enrollment_ids)[0]
        enrollment = self.enrollments.get_enrollment_for_course(course_id)
        self.assert_cache_in_db()

        # normal update that creates also the entry
        CachedEdxDataApi.update_cached_enrollment(self.user, enrollment, course_id, False)
        self.assert_cache_in_db(enrollment_keys=[course_id])
        cached_enr = CachedEnrollment.objects.get(user=self.user, course_run__edx_course_key=course_id)
        assert cached_enr.data == enrollment.json
        assert mocked_index.delay.called is False
        # update of different data with indexing
        enr_json = {
            "course_details": {
                "course_id": course_id,
            },
            "is_active": True,
            "mode": "verified",
            "user": self.user.username
        }
        enrollment_new = Enrollment(enr_json)
        CachedEdxDataApi.update_cached_enrollment(self.user, enrollment_new, course_id, True)
        self.assert_cache_in_db(enrollment_keys=[course_id])
        cached_enr.refresh_from_db()
        assert cached_enr.data == enr_json
        mocked_index.delay.assert_any_call([self.user])

    @patch('search.tasks.index_users', autospec=True)
    def test_update_cached_enrollments(self, mocked_index):
        """Test for update_cached_enrollments."""
        self.assert_cache_in_db()
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        CachedEdxDataApi.update_cached_enrollments(self.user, self.edx_client)
        self.assert_cache_in_db(enrollment_keys=self.enrollment_ids)
        cache_time = UserCacheRefreshTime.objects.get(user=self.user)
        now = datetime.now(tz=pytz.UTC)
        assert cache_time.enrollment <= now
        assert mocked_index.delay.called is True
        mocked_index.reset_mock()

        # add another cached element for another course that will be removed by the refresh
        cached_enr = CachedEnrollmentFactory.create(user=self.user)
        self.assert_cache_in_db(enrollment_keys=list(self.enrollment_ids) + [cached_enr.course_run.edx_course_key])
        CachedEdxDataApi.update_cached_enrollments(self.user, self.edx_client)
        self.assert_cache_in_db(enrollment_keys=self.enrollment_ids)
        cache_time.refresh_from_db()
        assert cache_time.enrollment >= now
        mocked_index.delay.assert_called_once_with([self.user])

    @patch('search.tasks.index_users', autospec=True)
    def test_update_cached_certificates(self, mocked_index):
        """Test for update_cached_certificates."""
        assert self.verified_certificates_ids.issubset(self.certificates_ids)
        self.assert_cache_in_db()
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        CachedEdxDataApi.update_cached_certificates(self.user, self.edx_client)
        self.assert_cache_in_db(certificate_keys=self.verified_certificates_ids)
        cache_time = UserCacheRefreshTime.objects.get(user=self.user)
        now = datetime.now(tz=pytz.UTC)
        assert cache_time.certificate <= now
        assert mocked_index.delay.called is True
        mocked_index.reset_mock()

        # add another cached element for another course that will be removed by the refresh
        cached_cert = CachedCertificateFactory.create(user=self.user)
        self.assert_cache_in_db(
            certificate_keys=list(self.verified_certificates_ids) + [cached_cert.course_run.edx_course_key])
        CachedEdxDataApi.update_cached_certificates(self.user, self.edx_client)
        self.assert_cache_in_db(certificate_keys=self.verified_certificates_ids)
        cache_time.refresh_from_db()
        assert cache_time.certificate >= now
        mocked_index.delay.assert_called_once_with([self.user])

    @patch('search.tasks.index_users', autospec=True)
    def test_update_cached_current_grades(self, mocked_index):
        """Test for update_cached_current_grades."""
        self.assert_cache_in_db()
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        CachedEdxDataApi.update_cached_current_grades(self.user, self.edx_client)
        self.assert_cache_in_db(grades_keys=self.grades_ids)
        cache_time = UserCacheRefreshTime.objects.get(user=self.user)
        now = datetime.now(tz=pytz.UTC)
        assert cache_time.current_grade <= now
        assert mocked_index.delay.called is True
        mocked_index.reset_mock()

        # add another cached element for another course that will be removed by the refresh
        cached_grade = CachedCurrentGradeFactory.create(user=self.user)
        self.assert_cache_in_db(grades_keys=list(self.grades_ids) + [cached_grade.course_run.edx_course_key])
        CachedEdxDataApi.update_cached_current_grades(self.user, self.edx_client)
        self.assert_cache_in_db(grades_keys=self.grades_ids)
        cache_time.refresh_from_db()
        assert cache_time.current_grade >= now
        mocked_index.delay.assert_called_once_with([self.user])

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cached_current_grades')
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cached_certificates')
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cached_enrollments')
    def test_update_cache_if_expired(self, mock_enr, mock_cert, mock_grade):
        """Test for update_cache_if_expired"""
        all_mocks = (mock_enr, mock_cert, mock_grade, )

        with self.assertRaises(ValueError):
            CachedEdxDataApi.update_cache_if_expired(self.user, self.edx_client, 'footype')

        # if there is no entry in the UserCacheRefreshTime the cache is not fresh and needs to be refreshed
        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            # the following is possible only because a mocked function is called
            assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
            CachedEdxDataApi.update_cache_if_expired(self.user, self.edx_client, cache_type)
        for mock_func in all_mocks:
            assert mock_func.called is True
            mock_func.reset_mock()

        # if we create a fresh entry in the UserCacheRefreshTime, no update is called
        now = datetime.now(tz=pytz.UTC)
        user_cache = UserCacheRefreshTimeFactory.create(
            user=self.user,
            enrollment=now,
            certificate=now,
            current_grade=now,
        )
        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            CachedEdxDataApi.update_cache_if_expired(self.user, self.edx_client, cache_type)
        for mock_func in all_mocks:
            assert mock_func.called is False
            mock_func.reset_mock()

        # moving back the last access time, the functions are called again
        yesterday = now - timedelta(days=1)
        user_cache.enrollment = yesterday
        user_cache.certificate = yesterday
        user_cache.current_grade = yesterday
        user_cache.save()
        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            CachedEdxDataApi.update_cache_if_expired(self.user, self.edx_client, cache_type)
        for mock_func in all_mocks:
            assert mock_func.called is True
