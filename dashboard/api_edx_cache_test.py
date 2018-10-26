"""
Tests for the dashboard APIs functions that deal with the edx cached data
"""

from datetime import timedelta
from unittest.mock import patch, MagicMock, ANY

import ddt
from requests.exceptions import HTTPError
from edx_api.certificates.models import Certificate, Certificates
from edx_api.enrollments.models import Enrollment, Enrollments
from edx_api.grades.models import CurrentGrade, CurrentGrades

from backends.edxorg import EdxOrgOAuth2
from backends.exceptions import InvalidCredentialStored
from courses.factories import (
    FullProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from dashboard import models
from dashboard.api_edx_cache import (
    CachedEdxUserData,
    CachedEdxDataApi,
    UserCachedRunData,
)
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
from micromasters.utils import (
    load_json_from_file,
    now_in_utc,
)
from search.base import MockedESTestCase


class CachedEdxUserDataTests(MockedESTestCase):
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
        p2 = FullProgramFactory.create()
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
        assert sorted(edx_user_data.enrollments.get_enrolled_course_ids()) == sorted(ids)
        assert sorted(edx_user_data.certificates.all_courses_verified_certs) == sorted(ids)
        assert sorted(edx_user_data.current_grades.all_course_ids) == sorted(ids)

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

    def test_get_run_data(self):
        """Test for the get_run_data method"""
        edx_user_data = CachedEdxUserData(self.user)
        run_data = edx_user_data.get_run_data(self.p1_course_run_keys[0])
        assert isinstance(run_data, UserCachedRunData)
        assert isinstance(run_data.enrollment, Enrollment)
        assert isinstance(run_data.certificate, Certificate)
        assert isinstance(run_data.current_grade, CurrentGrade)
        assert run_data.enrollment.course_id == self.p1_course_run_keys[0]
        assert run_data.certificate.course_id == self.p1_course_run_keys[0]
        assert run_data.current_grade.course_id == self.p1_course_run_keys[0]


@ddt.ddt
class CachedEdxDataApiTests(MockedESTestCase):
    """
    Tests for the CachedEdxDataApi class
    """

    @classmethod
    def setUpTestData(cls):
        """
        Set up data
        """
        cls.user = UserFactory.create()
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.user.username),
            extra_data={"access_token": "fooooootoken"}
        )

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
        assert cache_time.enrollment <= now_in_utc()
        assert cache_time.certificate is None
        assert cache_time.current_grade is None

        old_timestamp = now_in_utc() - timedelta(days=1)
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
        now = now_in_utc()
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

    @ddt.data('certificate', 'enrollment', 'current_grade')
    def test_are_all_caches_fresh(self, cache_type):
        """Test for are_all_caches_fresh"""
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        assert CachedEdxDataApi.are_all_caches_fresh(self.user) is False
        now = now_in_utc()
        yesterday = now - timedelta(days=1)
        user_cache = UserCacheRefreshTimeFactory.create(
            user=self.user,
            enrollment=now,
            certificate=now,
            current_grade=now,
        )
        assert CachedEdxDataApi.are_all_caches_fresh(self.user) is True
        setattr(user_cache, cache_type, yesterday)
        user_cache.save()
        assert CachedEdxDataApi.are_all_caches_fresh(self.user) is False
        setattr(user_cache, cache_type, now)
        user_cache.save()
        assert CachedEdxDataApi.are_all_caches_fresh(self.user) is True

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
        mocked_index.delay.assert_any_call([self.user.id], check_if_changed=True)

    @patch('search.tasks.index_users', autospec=True)
    def test_update_cached_enrollments(self, mocked_index):
        """Test for update_cached_enrollments."""
        self.assert_cache_in_db()
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        CachedEdxDataApi.update_cached_enrollments(self.user, self.edx_client)
        self.assert_cache_in_db(enrollment_keys=self.enrollment_ids)
        cache_time = UserCacheRefreshTime.objects.get(user=self.user)
        now = now_in_utc()
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
        mocked_index.delay.assert_called_once_with([self.user.id], check_if_changed=True)

    @patch('search.tasks.index_users', autospec=True)
    def test_update_cached_certificates(self, mocked_index):
        """Test for update_cached_certificates."""
        assert self.verified_certificates_ids.issubset(self.certificates_ids)
        self.assert_cache_in_db()
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        CachedEdxDataApi.update_cached_certificates(self.user, self.edx_client)
        self.assert_cache_in_db(certificate_keys=self.verified_certificates_ids)
        cache_time = UserCacheRefreshTime.objects.get(user=self.user)
        now = now_in_utc()
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
        mocked_index.delay.assert_called_once_with([self.user.id], check_if_changed=True)

    @patch('search.tasks.index_users', autospec=True)
    def test_update_cached_current_grades(self, mocked_index):
        """Test for update_cached_current_grades."""
        self.assert_cache_in_db()
        assert UserCacheRefreshTime.objects.filter(user=self.user).exists() is False
        CachedEdxDataApi.update_cached_current_grades(self.user, self.edx_client)
        self.assert_cache_in_db(grades_keys=self.grades_ids)
        cache_time = UserCacheRefreshTime.objects.get(user=self.user)
        now = now_in_utc()
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
        mocked_index.delay.assert_called_once_with([self.user.id], check_if_changed=True)

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
        now = now_in_utc()
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

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cached_enrollments')
    @ddt.data(400, 401, 405,)
    def test_update_cache_if_expired_http_errors(self, status_code, mock_enr):
        """
        Test for update_cache_if_expired in case a backend function raises an HTTPError
        """
        def raise_http_error(*args, **kwargs):  # pylint: disable=unused-argument
            """Mock function to raise an exception"""
            error = HTTPError()
            error.response = MagicMock()
            error.response.status_code = status_code
            raise error
        mock_enr.side_effect = raise_http_error
        if status_code in (400, 401):
            with self.assertRaises(InvalidCredentialStored):
                CachedEdxDataApi.update_cache_if_expired(self.user, self.edx_client, CachedEdxDataApi.ENROLLMENT)
        else:
            with self.assertRaises(HTTPError):
                CachedEdxDataApi.update_cache_if_expired(self.user, self.edx_client, CachedEdxDataApi.ENROLLMENT)

    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cached_current_grades')
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cached_certificates')
    @patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cached_enrollments')
    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_update_all_cached_grade_data(self, mock_refr, mock_enr, mock_cert, mock_grade):
        """Test for update_all_cached_grade_data"""
        for mock_func in (mock_refr, mock_enr, mock_cert, mock_grade, ):
            assert mock_func.called is False
        CachedEdxDataApi.update_all_cached_grade_data(self.user)
        assert mock_enr.called is False
        mock_refr.assert_called_once_with(self.user.social_auth.get(provider=EdxOrgOAuth2.name))
        for mock_func in (mock_cert, mock_grade, ):
            mock_func.assert_called_once_with(self.user, ANY)
