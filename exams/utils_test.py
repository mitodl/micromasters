"""Test cases for the exam util"""
from datetime import datetime, timedelta

from unittest.mock import patch
from ddt import ddt, data, unpack
import pytz
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.test import (
    SimpleTestCase,
    TestCase,
    override_settings,
)
from factory.django import mute_signals

from courses.factories import CourseRunFactory
from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from dashboard.models import ProgramEnrollment
from dashboard.utils import get_mmtrack
from exams.utils import (
    authorize_for_exam,
    bulk_authorize_for_exam,
    ExamAuthorizationException,
    exponential_backoff,
    message_not_passed_or_exist_template,
    message_not_eligible_template,
    validate_profile
)
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from ecommerce.factories import (
    OrderFactory,
    LineFactory,
    CoursePriceFactory
)
from grades.constants import FinalGradeStatus
from grades.factories import FinalGradeFactory
from grades.models import FinalGrade
from financialaid.api_test import create_program
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase


def create_order(user, course_run):
    """"
    create payment for course
    """
    order = OrderFactory.create(user=user, status='fulfilled')
    LineFactory.create(order=order, course_key=course_run.edx_course_key)
    return order


@ddt
class ExamBackoffUtilsTest(SimpleTestCase):
    """Tests for exam tasks"""
    @data(
        (5, 1, 5),
        (5, 2, 25),
        (5, 3, 125),
    )
    @unpack
    def test_exponential_backoff_values(self, base, retries, expected):  # pylint: disable=no-self-use
        """
        Test that exponential_backoff returns a power of settings.EXAMS_SFTP_BACKOFF_BASE
        """
        with self.settings(EXAMS_SFTP_BACKOFF_BASE=base):
            assert exponential_backoff(retries) == expected

    def test_exponential_backoff_invalid(self):  # pylint: disable=no-self-use
        """
        Test that exponential_backoff raises a configuration error if it gets an invalid value
        """
        with self.settings(EXAMS_SFTP_BACKOFF_BASE='NOT_AN_INT'):
            with self.assertRaises(ImproperlyConfigured):
                exponential_backoff(1)


class ExamAuthorizationUtilsTests(TestCase):
    """Tests for exam util"""
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            profile = ProfileFactory.create()

        cls.program, _ = create_program(past=True)
        cls.user = profile.user
        cls.course_run = course_run = cls.program.course_set.first().courserun_set.first()
        with mute_signals(post_save):
            CachedEnrollmentFactory.create(user=cls.user, course_run=course_run)
        CachedCurrentGradeFactory.create(
            user=cls.user,
            course_run=cls.course_run,
            data={
                "passed": True,
                "percent": 0.9,
                "course_key": cls.course_run.edx_course_key,
                "username": cls.user.username
            }
        )
        CachedCertificateFactory.create(user=cls.user, course_run=cls.course_run)
        with mute_signals(post_save):
            cls.final_grade = FinalGradeFactory.create(
                user=cls.user,
                course_run=cls.course_run,
                passed=True,
                course_run_paid_on_edx=True,
            )

    def test_exam_authorization(self):
        """
        test exam_authorization when user passed and paid for course.
        """
        create_order(self.user, self.course_run)
        mmtrack = get_mmtrack(self.user, self.program)
        self.assertTrue(mmtrack.has_paid(self.course_run.edx_course_key))
        self.assertTrue(mmtrack.has_passed_course(self.course_run.edx_course_key))

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is False

        authorize_for_exam(mmtrack, self.course_run)

        # Assert user has exam profile and authorization.
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is True
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is True

    @override_settings(FEATURES={"SUPPRESS_PAYMENT_FOR_EXAM": False})
    def test_exam_authorization_when_not_paid(self):
        """
        test exam_authorization when user has passed course but not paid.
        """
        with mute_signals(post_save):
            self.final_grade.course_run_paid_on_edx = False
            self.final_grade.save()
        mmtrack = get_mmtrack(self.user, self.program)
        assert mmtrack.has_paid(self.course_run.edx_course_key) is False

        expected_errors_message = message_not_eligible_template.format(
            user=mmtrack.user.username,
            course_id=self.course_run.edx_course_key
        )

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException) as eae:
            authorize_for_exam(mmtrack, self.course_run)

        assert eae.exception.args[0] == expected_errors_message

        # Assert user has no exam profile and authorization after exception.
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is False

    @override_settings(FEATURES={"SUPPRESS_PAYMENT_FOR_EXAM": True})
    def test_exam_authorization_when_payment_check_suppress(self):
        """
        test exam_authorization when user has passed and payment check is suppressed.
        """
        with patch('dashboard.utils.MMTrack.has_passed_course', autospec=True, return_value=True):
            mmtrack = get_mmtrack(self.user, self.program)
            assert mmtrack.has_paid(self.course_run.edx_course_key) is False

            # Neither user has exam profile nor authorization.
            assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=mmtrack.user,
                course=self.course_run.course
            ).exists() is False

            authorize_for_exam(mmtrack, self.course_run)

            # Assert user has exam profile and authorization.
            assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is True
            assert ExamAuthorization.objects.filter(
                user=mmtrack.user,
                course=self.course_run.course
            ).exists() is True

    def test_exam_authorization_when_not_passed_course(self):
        """
        test exam_authorization when user has not passed course but paid.
        """
        create_order(self.user, self.course_run)
        with patch('dashboard.utils.MMTrack.has_passed_course', autospec=True, return_value=False):
            mmtrack = get_mmtrack(self.user, self.program)
            expected_errors_message = message_not_passed_or_exist_template.format(
                user=mmtrack.user.username,
                course_id=self.course_run.edx_course_key
            )
            assert mmtrack.has_paid(self.course_run.edx_course_key) is True
            assert mmtrack.has_passed_course(self.course_run.edx_course_key) is False

            # Neither user has exam profile nor authorization.
            assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=mmtrack.user,
                course=self.course_run.course
            ).exists() is False

            with self.assertRaises(ExamAuthorizationException) as eae:
                authorize_for_exam(mmtrack, self.course_run)

            assert eae.exception.args[0] == expected_errors_message

            # assert exam profile created but user is not authorize
            assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is True
            assert ExamAuthorization.objects.filter(
                user=mmtrack.user,
                course=self.course_run.course
            ).exists() is False


@override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v0"})
class BulkExamUtilV0Tests(TestCase):
    """Tests for authorization_user_exam command operations"""
    @classmethod
    def setup_course_run_data(cls, user, course_run):
        """
        creates user records like CachedGrades, CachedEnrollments and CachedCertificate
        """
        with mute_signals(post_save):
            CachedEnrollmentFactory.create(user=user, course_run=course_run)
        CachedCurrentGradeFactory.create(
            user=user,
            course_run=course_run,
            data={
                "passed": True,
                "percent": 0.9,
                "course_key": course_run.edx_course_key,
                "username": user.username
            }
        )
        CachedCertificateFactory.create(user=user, course_run=course_run)
        create_order(user, course_run)

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.users = [profile.user for profile in ProfileFactory.create_batch(2)]

        cls.program, _ = create_program(past=True)
        cls.course_run = cls.program.course_set.first().courserun_set.first()

        for user in cls.users:
            with mute_signals(post_save):
                ProgramEnrollment.objects.create(user=user, program=cls.program)
            cls.setup_course_run_data(user, cls.course_run)

        # second passed run on same courses
        cls.course_run2 = CourseRunFactory.create(
            end_date=datetime.now(tz=pytz.UTC) - timedelta(days=366),
            enrollment_end=datetime.now(tz=pytz.UTC) - timedelta(days=500),
            course=cls.course_run.course
        )
        CoursePriceFactory.create(
            course_run=cls.course_run2,
            is_valid=True
        )

        for user in cls.users:
            cls.setup_course_run_data(user, cls.course_run2)

    def test_exam_authorization_v1(self):
        """For all users in any program"""
        for user in self.users:
            # Neither user has exam profile nor authorization.
            assert ExamProfile.objects.filter(profile=user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is False

        bulk_authorize_for_exam()
        for user in self.users:
            assert ExamProfile.objects.filter(profile=user.profile).exists() is True
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is True

    def test_exam_authorization_specific_user_v1(self):
        """Authorize a user for exams of passed and paid courses"""
        user = self.users[0]
        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        bulk_authorize_for_exam(username=user.username)
        assert ExamProfile.objects.filter(profile=user.profile).exists() is True
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is True

    def test_exam_authorization_specific_user_specific_course_v1(self):
        """Authorize a user for exams of passed and paid courses"""
        for user in self.users:
            # Neither user has exam profile nor authorization.
            assert ExamProfile.objects.filter(profile=user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is False

        user1 = self.users[0]
        user2 = self.users[1]

        bulk_authorize_for_exam(
            username=user1.username
        )

        # user 1 is authorized for exam
        assert ExamProfile.objects.filter(profile=user1.profile).exists() is True
        assert ExamAuthorization.objects.filter(
            user=user1,
            course=self.course_run.course
        ).exists() is True

        # user 2 is not authorized
        assert ExamProfile.objects.filter(profile=user2.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user2,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_wrong_program_id_v1(self):
        """Assert user not authorize when program id is wrong"""
        user = self.users[0]
        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException) as e:
            bulk_authorize_for_exam(
                program_id=-1,
                username=user.username
            )

        assert e.exception.args[0] == "[Exam authorization] exam_series_code is missing on program='%s'", -1
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_invalid_user_v1(self):
        """Assert user not authorize when username wrong"""
        user = self.users[0]
        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException) as e:
            bulk_authorize_for_exam(
                username="invalid_user"
            )

        assert e.exception.args[0] == '[Exam authorization] Invalid username: %s', "invalid_user"
        for user in self.users:
            assert ExamProfile.objects.filter(profile=user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is False

    def test_exam_authorization_no_exam_module_set_v1(self):
        """Test authorization when `exam_module` is not set on course."""
        user = self.users[0]
        self.course_run.course.exam_module = None
        self.course_run.course.save()

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with patch("exams.utils.log") as log:
            bulk_authorize_for_exam(
                username=user.username,
                program_id=self.program.id
            )

        log.error.assert_called_with(
            'Either exam_module is not set for course id="%s" or user="%s" has no enrollment(s)',
            self.course_run.course.id,
            user.username
        )

        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_no_exam_series_code_set_v1(self):
        """Test authorization when `exam_series_code` is not set on program."""
        user = self.users[0]
        self.program.exam_series_code = None
        self.program.save()
        program_id = self.program.id

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException) as e:
            bulk_authorize_for_exam(username=user.username, program_id=program_id)

        assert e.exception.args[0] == "[Exam authorization] exam_series_code is missing on program='%s'", program_id

        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False


@override_settings(FEATURES={"FINAL_GRADE_ALGORITHM": "v1"})
class BulkExamUtilV1Tests(TestCase):
    """Tests for authorization_user_exam command operations"""
    @classmethod
    def setup_course_run_data(cls, user, course_run):
        """
        creates user records like CachedGrades, CachedEnrollments and CachedCertificate
        """
        with mute_signals(post_save):
            CachedEnrollmentFactory.create(user=user, course_run=course_run)
        CachedCurrentGradeFactory.create(
            user=user,
            course_run=course_run,
            data={
                "passed": True,
                "percent": 0.9,
                "course_key": course_run.edx_course_key,
                "username": user.username
            }
        )
        with mute_signals(post_save):
            FinalGradeFactory.create(
                user=user,
                course_run=course_run,
                passed=True,
                grade=0.9,
                course_run_paid_on_edx=True
            )
        CachedCertificateFactory.create(user=user, course_run=course_run)
        create_order(user, course_run)

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.users = [profile.user for profile in ProfileFactory.create_batch(2)]

        cls.program, _ = create_program(past=True)
        cls.course_run = cls.program.course_set.first().courserun_set.first()

        for user in cls.users:
            with mute_signals(post_save):
                ProgramEnrollment.objects.create(user=user, program=cls.program)
            cls.setup_course_run_data(user, cls.course_run)

        # second passed run on same courses
        cls.course_run2 = CourseRunFactory.create(
            end_date=datetime.now(tz=pytz.UTC) - timedelta(days=366),
            enrollment_end=datetime.now(tz=pytz.UTC) - timedelta(days=500),
            course=cls.course_run.course
        )
        CoursePriceFactory.create(
            course_run=cls.course_run2,
            is_valid=True
        )
        cls.course_runs = [cls.course_run, cls.course_run2]

        for user in cls.users:
            cls.setup_course_run_data(user, cls.course_run2)

    def test_exam_authorization(self):
        """For all users in any program"""
        for user in self.users:
            # Neither user has exam profile nor authorization.
            assert ExamProfile.objects.filter(profile=user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is False

        bulk_authorize_for_exam()
        for user in self.users:
            assert ExamProfile.objects.filter(profile=user.profile).exists() is True
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is True

    def test_exam_authorization_specific_user(self):
        """Authorize a user for exams of passed and paid courses"""
        user = self.users[0]
        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        bulk_authorize_for_exam(username=user.username)
        assert ExamProfile.objects.filter(profile=user.profile).exists() is True
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is True

    def test_exam_authorization_specific_user_specific_course(self):
        """Authorize a user for exams of passed and paid courses"""
        for user in self.users:
            # Neither user has exam profile nor authorization.
            assert ExamProfile.objects.filter(profile=user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is False

        user1 = self.users[0]
        user2 = self.users[1]
        bulk_authorize_for_exam(
            username=user1.username
        )

        # user 1 is authorized for exam
        assert ExamProfile.objects.filter(profile=user1.profile).exists() is True
        assert ExamAuthorization.objects.filter(
            user=user1,
            course=self.course_run.course
        ).exists() is True

        # user 2 is not authorized
        assert ExamProfile.objects.filter(profile=user2.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user2,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_wrong_program_id(self):
        """Assert user not authorize when program id is wrong"""
        user = self.users[0]
        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException) as e:
            bulk_authorize_for_exam(
                program_id=-1,
                username=user.username
            )

        assert e.exception.args[0] == "[Exam authorization] exam_series_code is missing on program='%s'", -1
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_invalid_user(self):
        """Assert user not authorize when username wrong"""
        user = self.users[0]
        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException) as e:
            bulk_authorize_for_exam(
                username="invalid_user"
            )

        assert e.exception.args[0] == '[Exam authorization] Invalid username: %s', "invalid_user"
        for user in self.users:
            assert ExamProfile.objects.filter(profile=user.profile).exists() is False
            assert ExamAuthorization.objects.filter(
                user=user,
                course=self.course_run.course
            ).exists() is False

    def test_exam_authorization_no_exam_module_set(self):
        """Test authorization when `exam_module` is not set on course."""
        user = self.users[0]
        self.course_run.course.exam_module = None
        self.course_run.course.save()

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with patch("exams.utils.log") as log:
            bulk_authorize_for_exam(
                username=user.username,
                program_id=self.program.id
            )

        log.error.assert_called_with(
            'Either exam_module is not set for course id="%s" or user="%s" has no enrollment(s)',
            self.course_run.course.id,
            user.username
        )

        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_pending_final_grade(self):
        """Test authorization when final grade is pending."""
        user = self.users[0]
        course = self.course_run.course
        # change the final grade status to pending
        with mute_signals(post_save):
            # set status=PENDING for both course runs, so that user can not get exam authorization.
            FinalGrade.objects.filter(course_run=self.course_run, user=user).update(status=FinalGradeStatus.PENDING)
            FinalGrade.objects.filter(course_run=self.course_run2, user=user).update(status=FinalGradeStatus.PENDING)

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(user=user, course=course).exists() is False

        with patch("exams.utils.log") as log:
            bulk_authorize_for_exam(
                username=user.username,
                program_id=self.program.id
            )

        log.exception.assert_called_with(
            'Unable to authorize user: %s for exam on course_id: %s',
            user.username,
            course.id
        )

        mmtrack = get_mmtrack(user, self.program)
        assert mmtrack.has_paid(self.course_run.edx_course_key) is True
        assert mmtrack.has_paid(self.course_run2.edx_course_key) is True
        assert ExamProfile.objects.filter(profile=user.profile).exists() is True
        # because user has no complete final grade.
        assert ExamAuthorization.objects.filter(user=user, course=course).exists() is False

    def test_exam_authorization_no_exam_series_code_set(self):
        """Test authorization when `exam_series_code` is not set on program."""
        user = self.users[0]
        self.program.exam_series_code = None
        self.program.save()
        program_id = self.program.id

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException) as e:
            bulk_authorize_for_exam(username=user.username, program_id=program_id)

        assert e.exception.args[0] == "[Exam authorization] exam_series_code is missing on program='%s'", program_id

        assert ExamProfile.objects.filter(profile=user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=user,
            course=self.course_run.course
        ).exists() is False


@ddt
class ExamProfileValidationTests(MockedESTestCase):
    """Tests for exam utils validate_profile"""

    @classmethod
    def setUpTestData(cls):
        """
        Create a profile
        """
        super().setUpTestData()
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create()

    def setUp(self):
        """
        refresh profile
        """
        super().setUp()
        self.profile.refresh_from_db()

    def test_exam_profile_validated(self):
        """
        test validate_profile when a field is empty
        """
        assert validate_profile(self.profile) is True

    @data('address', 'city', 'state_or_territory', 'country', 'phone_number')
    def test_when_field_is_blank(self, field):
        """
        test validate_profile when a field is empty
        """
        setattr(self.profile, field, '')
        self.profile.save()
        assert validate_profile(self.profile) is False

    @data('address', 'city', 'state_or_territory', 'country', 'phone_number')
    def test_when_field_is_invalid(self, field):
        """
        test validate_profile when a field is invalid
        """
        setattr(self.profile, field, '汉字')
        self.profile.save()
        assert validate_profile(self.profile) is False

    @data(
        ('AD', '通州区', True),
        ('AD', '', True),
        ('CA', '通州区', False),
        ('CA', '', False),
        ('US', '通州区', False),
        ('US', '', False)
    )
    @unpack
    def test_postal_code(self, country, postal_code, result):
        """
        when postal_code is (not) required and valid/invalid
        """
        self.profile.country = country
        self.profile.postal_code = postal_code
        self.profile.save()
        assert validate_profile(self.profile) is result

    @data(
        ('汉字', 'Andrew', True),
        ('', 'Andrew', True),
        ('汉字', '', False),
        ('', '', False)
    )
    @unpack
    def test_romanized_name(self, name, romanized_name, result):
        """
        test romanized name optional/required
        """
        self.profile.first_name = name
        self.profile.romanized_first_name = romanized_name
        self.profile.save()
        assert validate_profile(self.profile) is result

    @data('汉字', '')
    def test_user_email(self, email):
        """
        test invalid email
        """
        self.profile.user.email = email
        self.profile.user.save()
        assert validate_profile(self.profile) is False
