"""Test cases for the exam util"""
from unittest.mock import patch

import ddt
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.test import (
    SimpleTestCase,
    TestCase,
)
from factory.django import mute_signals

from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from dashboard.utils import get_mmtrack
from ecommerce.factories import (
    OrderFactory,
    LineFactory,
)
from exams.utils import (
    authorize_for_exam,
    exponential_backoff,
)
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from financialaid.api_test import create_program
from profiles.factories import ProfileFactory


@ddt.ddt
class ExamBackoffUtilsTest(SimpleTestCase):
    """Tests for exam tasks"""
    @ddt.data(
        (5, 1, 5),
        (5, 2, 25),
        (5, 3, 125),
    )
    @ddt.unpack
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

        cls.program, cls.tier_programs = create_program(past=True)
        cls.user = profile.user
        cls.course_run = course_run = cls.program.course_set.first().courserun_set.first()
        cls.enrollment = CachedEnrollmentFactory.create(user=cls.user, course_run=course_run)
        CachedCurrentGradeFactory.create(
            user=cls.user,
            course_run=course_run,
            data={
                "passed": True,
                "percent": 0.9,
                "course_key": course_run.edx_course_key,
                "username": cls.user.username
            }
        )
        CachedCertificateFactory.create(user=cls.user, course_run=course_run)

    def create_order(self, user, course_run):
        """"
        create payment for course
        """
        # pylint: disable=no-self-use
        order = OrderFactory.create(user=user, status='fulfilled')
        LineFactory.create(order=order, course_key=course_run.edx_course_key)
        return order

    def test_exam_authorization(self):
        """
        test exam_authorization when user passed and paid for course.
        """
        self.create_order(self.user, self.course_run)
        mmtrack = get_mmtrack(self.user, self.program)
        self.assertTrue(mmtrack.has_paid(self.course_run.edx_course_key))
        self.assertTrue(mmtrack.has_passed_course(self.course_run.edx_course_key))

        authorize_for_exam(mmtrack, self.course_run)

        # assert Exam Authorization and profile created.
        self.assertTrue(ExamProfile.objects.filter(profile=mmtrack.user.profile).exists())
        self.assertTrue(ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists())

    def test_exam_authorization_when_not_paid(self):
        """
        test exam_authorization when user has passed course but not paid.
        """
        mmtrack = get_mmtrack(self.user, self.program)
        self.assertFalse(mmtrack.has_paid(self.course_run.edx_course_key))

        authorize_for_exam(mmtrack, self.course_run)

        # assert Exam Authorization and profile created.
        self.assertFalse(ExamProfile.objects.filter(profile=mmtrack.user.profile).exists())
        self.assertFalse(ExamAuthorization.objects.filter(
            user=mmtrack.user,
            course=self.course_run.course
        ).exists())

    def test_exam_authorization_when_not_passed_course(self):
        """
        test exam_authorization when user has not passed course but paid.
        """
        self.create_order(self.user, self.course_run)
        with patch('dashboard.utils.MMTrack.has_passed_course', autospec=True, return_value=False):
            mmtrack = get_mmtrack(self.user, self.program)
            self.assertTrue(mmtrack.has_paid(self.course_run.edx_course_key))
            self.assertFalse(mmtrack.has_passed_course(self.course_run.edx_course_key))

            authorize_for_exam(mmtrack, self.course_run)

            # assert Exam Authorization and profile created.
            self.assertTrue(ExamProfile.objects.filter(profile=mmtrack.user.profile).exists())
            self.assertFalse(ExamAuthorization.objects.filter(
                user=mmtrack.user,
                course=self.course_run.course
            ).exists())
