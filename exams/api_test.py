"""
Tests for exams API
"""
from unittest.mock import patch

import ddt
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.test import (
    SimpleTestCase,
    TestCase,
    override_settings,
)
from factory.django import mute_signals

from dashboard.factories import (
    CachedEnrollmentFactory,
    ProgramEnrollmentFactory,
)
from dashboard.utils import get_mmtrack
from dashboard.api import ATTEMPTS_PER_PAID_RUN
from ecommerce.factories import LineFactory
from exams.api import (
    authorize_for_exam_run,
    authorize_for_latest_passed_course,
    update_authorizations_for_exam_run,
    sso_digest,
    MESSAGE_NOT_ELIGIBLE_TEMPLATE,
    MESSAGE_NOT_PASSED_OR_EXIST_TEMPLATE,
)
from exams.exceptions import ExamAuthorizationException
from exams.factories import (
    ExamAuthorizationFactory,
    ExamRunFactory,
)
from exams.models import (
    ExamAuthorization,
    ExamProfile,
)
from financialaid.api_test import create_program
from grades.constants import FinalGradeStatus
from grades.factories import FinalGradeFactory
from profiles.factories import ProfileFactory


def create_order(user, course_run):
    """"
    create payment for course
    """
    return LineFactory.create(
        course_key=course_run.edx_course_key,
        order__fulfilled=True,
        order__user=user,
    ).order


class SSODigestTests(SimpleTestCase):
    """
    Tests for the sso_digest helper function
    """

    @override_settings(
        EXAMS_SSO_PASSPHRASE="C is for cookie",
        EXAMS_SSO_CLIENT_CODE="and that's good enough for me",
    )
    def test_that_sso_digest_computes_correctly(self):
        """Verifies sso_digest computes correctly"""

        # computed "by hand"
        assert sso_digest(123, 1486069731, 1800) == (
            'a64ea7218e4a67d863e03ec43ac40240af39f5924af46e02b2199e3f7974b8d3'
        )

    @override_settings(EXAMS_SSO_PASSPHRASE=None)
    def test_that_no_passphrase_raises(self):
        """Verifies that if we don't set the passphrase we raise an exception"""
        with self.assertRaises(ImproperlyConfigured):
            sso_digest(123, 1486069731, 1800)

    @override_settings(EXAMS_SSO_CLIENT_CODE=None)
    def test_that_no_client_code_raises(self):
        """Verifies that if we don't set the passphrase we raise an exception"""
        with self.assertRaises(ImproperlyConfigured):
            sso_digest(123, 1486069731, 1800)


@ddt.ddt
class ExamAuthorizationApiTests(TestCase):
    """Tests for exam api"""
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            profile = ProfileFactory.create()

        cls.program, _ = create_program(past=True)
        cls.user = profile.user
        cls.course_run = cls.program.course_set.first().courserun_set.first()
        with mute_signals(post_save):
            CachedEnrollmentFactory.create(user=cls.user, course_run=cls.course_run)
        cls.exam_run = ExamRunFactory.create(course=cls.course_run.course)
        with mute_signals(post_save):
            cls.final_grade = FinalGradeFactory.create(
                user=cls.user,
                course_run=cls.course_run,
                passed=True,
                course_run_paid_on_edx=False,
            )

    def test_exam_authorization_for_inactive_user(self):
        """
        test exam_authorization when inactive user passed and paid for course.
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()

        user = profile.user
        user.is_active = False
        user.save()
        with mute_signals(post_save):
            CachedEnrollmentFactory.create(user=user, course_run=self.course_run)

        with mute_signals(post_save):
            FinalGradeFactory.create(
                user=user,
                course_run=self.course_run,
                passed=True,
                course_run_paid_on_edx=False,
            )
        create_order(user, self.course_run)
        mmtrack = get_mmtrack(user, self.program)
        self.assertTrue(mmtrack.has_paid(self.course_run.edx_course_key))
        self.assertTrue(mmtrack.has_passed_course(self.course_run.edx_course_key))

        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is False

        with self.assertRaises(ExamAuthorizationException):
            authorize_for_exam_run(self.user, self.course_run, self.exam_run)

        # Assert user doesn't have exam profile and authorization
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is False

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

        authorize_for_exam_run(self.user, self.course_run, self.exam_run)

        # Assert user has exam profile and authorization.
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is True
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is True

    def test_exam_authorization_attempts_consumed(self):
        """
        test exam_authorization when user passed and paid, but used all their attempts
        """
        create_order(self.user, self.course_run)
        mmtrack = get_mmtrack(self.user, self.program)
        self.assertTrue(mmtrack.has_paid(self.course_run.edx_course_key))
        self.assertTrue(mmtrack.has_passed_course(self.course_run.edx_course_key))
        old_run = ExamRunFactory.create(course=self.course_run.course)
        ExamAuthorizationFactory.create_batch(
            ATTEMPTS_PER_PAID_RUN,
            exam_run=old_run,
            user=mmtrack.user,
            course=self.course_run.course,
            exam_taken=True,
        )

        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).count() == 2

        with self.assertRaises(ExamAuthorizationException):
            authorize_for_exam_run(self.user, self.course_run, self.exam_run)

        # assert no new authorizations got created
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).count() == 2

    def test_exam_authorization_course_mismatch(self):
        """
        test exam_authorization fails if course_run and exam_run courses mismatch
        """
        # Neither user has exam profile nor authorization.
        assert ExamProfile.objects.filter(profile=self.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=self.user,
            course=self.course_run.course
        ).exists() is False

        exam_run = ExamRunFactory.create()

        with self.assertRaises(ExamAuthorizationException):
            authorize_for_exam_run(self.user, self.course_run, exam_run)

        # Assert user has exam profile and authorization.
        assert ExamProfile.objects.filter(profile=self.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=self.user,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_when_not_paid(self):
        """
        test exam_authorization when user has passed course but not paid.
        """
        with mute_signals(post_save):
            self.final_grade.course_run_paid_on_edx = False
            self.final_grade.save()
        mmtrack = get_mmtrack(self.user, self.program)
        assert mmtrack.has_paid(self.course_run.edx_course_key) is False

        expected_errors_message = MESSAGE_NOT_ELIGIBLE_TEMPLATE.format(
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
            authorize_for_exam_run(self.user, self.course_run, self.exam_run)

        assert eae.exception.args[0] == expected_errors_message

        # Assert user has no exam profile and authorization after exception.
        assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists() is False

    def test_exam_authorization_when_not_passed_course(self):
        """
        test exam_authorization when user has not passed course but paid.
        """
        create_order(self.user, self.course_run)
        with patch('dashboard.utils.MMTrack.has_passed_course', autospec=True, return_value=False):
            mmtrack = get_mmtrack(self.user, self.program)
            expected_errors_message = MESSAGE_NOT_PASSED_OR_EXIST_TEMPLATE.format(
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
                authorize_for_exam_run(self.user, self.course_run, self.exam_run)

            assert eae.exception.args[0] == expected_errors_message

            # assert exam profile created but user is not authorized
            assert ExamProfile.objects.filter(profile=mmtrack.user.profile).exists() is True
            assert ExamAuthorization.objects.filter(
                user=mmtrack.user,
                course=self.course_run.course
            ).exists() is False

    @ddt.data(
        (False, False),
        (True, False),
        (False, True),
    )
    @ddt.unpack
    def test_update_authorizations_for_exam_run(self, is_future, is_past):
        """Tests update_authorizations_for_exam_run()"""
        exam_run = ExamRunFactory.create(scheduling_future=is_future, scheduling_past=is_past)
        taken_auth = ExamAuthorizationFactory.create(
            exam_run=exam_run,
            exam_taken=True,
            status=ExamAuthorization.STATUS_SUCCESS,
            operation=ExamAuthorization.OPERATION_ADD,
        )
        pending_auth = ExamAuthorizationFactory.create(
            exam_run=exam_run,
            status=ExamAuthorization.STATUS_PENDING,
            operation=ExamAuthorization.OPERATION_ADD,
        )
        nonpending_auths = []
        for status in [
                ExamAuthorization.STATUS_IN_PROGRESS,
                ExamAuthorization.STATUS_FAILED,
                ExamAuthorization.STATUS_SUCCESS,
        ]:
            nonpending_auths.append(ExamAuthorizationFactory.create(
                exam_run=exam_run,
                status=status,
                operation=ExamAuthorization.OPERATION_ADD,
            ))

        update_authorizations_for_exam_run(exam_run)

        taken_auth.refresh_from_db()
        assert taken_auth.status == ExamAuthorization.STATUS_SUCCESS
        assert taken_auth.operation == ExamAuthorization.OPERATION_ADD

        pending_auth.refresh_from_db()
        assert pending_auth.status == ExamAuthorization.STATUS_PENDING
        assert pending_auth.operation == ExamAuthorization.OPERATION_ADD

        for auth in nonpending_auths:
            auth.refresh_from_db()
            if is_past or is_future:
                assert auth.status != ExamAuthorization.STATUS_PENDING
                assert auth.operation == ExamAuthorization.OPERATION_ADD
            else:
                assert auth.status == ExamAuthorization.STATUS_PENDING
                assert auth.operation == ExamAuthorization.OPERATION_UPDATE


class ExamLatestCourseAuthorizationApiTests(TestCase):
    """Tests for latest course authorization api"""
    @classmethod
    def setUpTestData(cls):
        cls.program, _ = create_program(past=True)
        cls.course_run = cls.program.course_set.first().courserun_set.first()
        cls.course = cls.course_run.course
        cls.program_enrollment = ProgramEnrollmentFactory.create(program=cls.program)
        cls.user = cls.program_enrollment.user
        with mute_signals(post_save):
            cls.final_grades = sorted([
                FinalGradeFactory.create(
                    user=cls.user,
                    course_run=cls.course_run,
                    passed=False,
                    status=FinalGradeStatus.PENDING
                ),
                FinalGradeFactory.create(
                    user=cls.user,
                    course_run__course=cls.course,
                    passed=True,
                    status=FinalGradeStatus.COMPLETE
                ),
                FinalGradeFactory.create(
                    user=cls.user,
                    course_run__course=cls.course,
                    passed=True,
                    status=FinalGradeStatus.COMPLETE
                ),
            ], key=lambda final_grade: final_grade.course_run.end_date, reverse=True)

    def test_exam_authorization_multiple_runs(self):
        """Test that if the first enrollment is invalid it checks the second, but not the third"""
        exam_run = ExamRunFactory.create(course=self.course)

        with patch('exams.api.authorize_for_exam_run') as mock:
            mock.side_effect = [ExamAuthorizationException('invalid'), None, None]
            authorize_for_latest_passed_course(self.user, exam_run)

        assert mock.call_count == 2
        for enrollment in self.final_grades[:2]:  # two most recent runs
            mock.assert_any_call(self.user, enrollment.course_run, exam_run)
