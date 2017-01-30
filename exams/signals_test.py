"""
Tests for exam signals
"""
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.test import override_settings
from factory.django import mute_signals
import pytz

from courses.factories import (
    CourseFactory,
    CourseRunFactory
)
from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from exams.utils_test import create_order
from financialaid.api_test import create_program
from grades.factories import FinalGradeFactory
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase


# pylint: disable=no-self-use

class ExamSignalsTest(MockedESTestCase):
    """
    Tests for exam signals
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create()

        cls.program, _ = create_program(past=True)
        cls.course_run = course_run = cls.program.course_set.first().courserun_set.first()
        CachedCurrentGradeFactory.create(
            user=cls.profile.user,
            course_run=course_run,
            data={
                "passed": True,
                "percent": 0.9,
                "course_key": course_run.edx_course_key,
                "username": cls.profile.user.username
            }
        )
        CachedCertificateFactory.create(user=cls.profile.user, course_run=course_run)
        order = OrderFactory.create(user=cls.profile.user, status='fulfilled')
        LineFactory.create(order=order, course_key=course_run.edx_course_key)

    def test_update_exam_profile_called(self):
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

    @override_settings(FINAL_GRADE_ALGORITHM='v1')
    def test_update_exam_authorization_final_grade(self):
        """
        Verify that update_exam_authorization_final_grade is called when a FinalGrade saves
        """
        create_order(self.profile.user, self.course_run)
        with mute_signals(post_save):
            # muted because enrollment also trigger signal for profile creation. right now we are just
            # looking final grades
            CachedEnrollmentFactory.create(user=self.profile.user, course_run=self.course_run)

        # There is no ExamProfile or ExamAuthorization before creating the FinalGrade.
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=self.profile.user,
            course=self.course_run.course
        ).exists() is False

        final_grade = get_final_grade(self.profile.user, self.course_run)
        FinalGrade.objects.create(
            user=self.profile.user,
            course_run=self.course_run,
            passed=True,
        )

        # assert Exam Authorization and profile created.
        self.assertTrue(ExamProfile.objects.filter(profile=self.profile).exists())
        self.assertTrue(ExamAuthorization.objects.filter(
            user=self.profile.user,
            course=self.course_run.course
        ).exists())

    def test_update_exam_authorization_cached_enrollment(self):
        """
        Test exam profile creation when user enroll in course.
        """
        create_order(self.profile.user, self.course_run)
        # There is no ExamProfile before enrollment.
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False

        CachedEnrollmentFactory.create(user=self.profile.user, course_run=self.course_run)
        assert ExamProfile.objects.filter(profile=self.profile).exists() is True

    def test_update_exam_authorization_cached_enrollment_user_not_paid(self):
        """
        Test no exam profile created when user enrolled in the course but not paid for it.
        """
        CachedEnrollmentFactory.create(user=self.profile.user, course_run=self.course_run)
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False

    def test_update_exam_authorization_cached_enrollment_when_no_exam_on_course(self):
        """
        Test no exam profile created when course has not `exam_module` setting.
        """
        course = CourseFactory.create(program=self.program, exam_module=None)
        course_run = CourseRunFactory.create(
            end_date=datetime.now(tz=pytz.UTC) - timedelta(days=100),
            enrollment_end=datetime.now(tz=pytz.UTC) + timedelta(hours=1),
            course=course
        )
        create_order(self.profile.user, course_run)
        CachedEnrollmentFactory.create(user=self.profile.user, course_run=course_run)
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False
