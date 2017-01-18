"""
Tests for exam signals
"""
from django.contrib.auth.models import User
from django.test import TestCase
from django.db.models.signals import post_save
from factory.django import mute_signals

from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from ecommerce.factories import (
    OrderFactory,
    LineFactory,
)
from financialaid.api_test import create_program
from grades.api import get_final_grade
from grades.models import (
    FinalGrade,
    FinalGradeStatus,
)
from profiles.factories import ProfileFactory


class ExamSignalsTest(TestCase):
    """
    Tests for exam signals
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = profile = ProfileFactory.create()

        program, _ = create_program(past=True)
        cls.course_run = course_run = program.course_set.first().courserun_set.first()
        CachedCurrentGradeFactory.create(
            user=profile.user,
            course_run=course_run,
            data={
                "passed": True,
                "percent": 0.9,
                "course_key": course_run.edx_course_key,
                "username": profile.user.username
            }
        )
        CachedCertificateFactory.create(user=profile.user, course_run=course_run)
        order = OrderFactory.create(user=profile.user, status='fulfilled')
        LineFactory.create(order=order, course_key=course_run.edx_course_key)
        CachedEnrollmentFactory.create(user=profile.user, course_run=course_run)

    def test_update_exam_profile_called(self):  # pylint: disable=no-self-use
        """
        Verify that update_exam_profile is called when a profile saves
        """

        user = User.objects.create(username='test')
        profile = user.profile
        profile_exam = ExamProfile.objects.create(
            profile=profile,
            status=ExamProfile.PROFILE_SUCCESS,
        )
        profile.first_name = 'NewName'
        profile.save()

        profile_exam.refresh_from_db()

        assert profile_exam.status == ExamProfile.PROFILE_PENDING

    def test_update_exam_authorization_final_grade(self):  # pylint: disable=no-self-use
        """
        Verify that update_exam_authorization_final_grade is called when a FinalGrade saves
        """
        final_grade = get_final_grade(self.profile.user, self.course_run)
        FinalGrade.objects.create(
            user=self.profile.user,
            course_run=self.course_run,
            grade=final_grade.grade,
            passed=final_grade.passed,
            status=FinalGradeStatus.COMPLETE
        )

        # assert Exam Authorization and profile created.
        self.assertTrue(ExamProfile.objects.filter(profile=self.profile).exists())
        self.assertTrue(ExamAuthorization.objects.filter(
            user=self.profile.user,
            course=self.course_run.course
        ).exists())

    def test_update_exam_authorization_cached_enrollment(self):
        """
        Verify that update_exam_authorization_final_grade is called when a CachedEnrollment saves
        """
        # assert Exam Authorization and profile created. CachedEnrollmentFactory triggered the signal.
        self.assertTrue(ExamProfile.objects.filter(profile=self.profile).exists())
        self.assertTrue(ExamAuthorization.objects.filter(
            user=self.profile.user,
            course=self.course_run.course
        ).exists())
