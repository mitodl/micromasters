"""Test cases for the exam util"""
from unittest.mock import patch
from django.test import TestCase
from django.db.models.signals import post_save
from factory.django import mute_signals

from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from dashboard.utils import get_mmtrack
from financialaid.api_test import create_program
from exams.utils import authorize_for_exam
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from ecommerce.factories import (
    OrderFactory,
    LineFactory,
)
from profiles.factories import ProfileFactory


class ExamUtilTests(TestCase):
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
