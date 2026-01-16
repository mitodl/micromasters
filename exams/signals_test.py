"""
Tests for exam signals
"""
from datetime import timedelta

import ddt
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    create_program,
)
from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from exams.factories import ExamRunFactory
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from grades.factories import FinalGradeFactory
from micromasters.utils import now_in_utc
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase

@ddt.ddt
class ExamSignalsTest(MockedESTestCase):
    """
    Tests for exam signals
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create()

        cls.program, _ = create_program(past=True)
        cls.course_run = cls.program.course_set.first().courserun_set.first()
        CachedCurrentGradeFactory.create(
            user=cls.profile.user,
            course_run=cls.course_run,
            data={
                "passed": True,
                "percent": 0.9,
                "course_key": cls.course_run.edx_course_key,
                "username": cls.profile.user.username
            }
        )
        CachedCertificateFactory.create(user=cls.profile.user, course_run=cls.course_run)
        cls.exam_run = ExamRunFactory.create(
            course=cls.course_run.course,
            date_first_schedulable=now_in_utc() - timedelta(days=1),
        )

    def test_update_exam_authorization_final_grade(self):
        """
        Verify that update_exam_authorization_final_grade is called when a FinalGrade saves
        """
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

        FinalGradeFactory.create(
            user=self.profile.user,
            course_run=self.course_run,
            passed=True,
            course_run_paid_on_edx=True,  # Mark as paid instead of creating an order
        )

        # assert Exam Authorization and profile created.
        assert ExamProfile.objects.filter(profile=self.profile).exists() is True
        assert ExamAuthorization.objects.filter(
            user=self.profile.user,
            course=self.course_run.course
        ).exists() is True

    def test_update_exam_authorization_final_grade_when_user_not_paid(self):
        """
        Verify that update_exam_authorization_final_grade is called and log exception when
        FinalGrade saves user dont match exam authorization criteria
        """
        with mute_signals(post_save):
            # muting signal for CachedEnrollment. Because CachedEnrollment and FinalGrade both omits
            # signal, we want to see behaviour of FinalGrade here
            CachedEnrollmentFactory.create(user=self.profile.user, course_run=self.course_run)

        assert ExamProfile.objects.filter(profile=self.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=self.profile.user,
            course=self.course_run.course
        ).exists() is False

        FinalGradeFactory.create(
            user=self.profile.user,
            course_run=self.course_run,
            passed=True,
            course_run_paid_on_edx=False,
        )

        # assert Exam Authorization and profile not created.
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False
        assert ExamAuthorization.objects.filter(
            user=self.profile.user,
            course=self.course_run.course
        ).exists() is False

    def test_update_exam_authorization_cached_enrollment(self):
        """
        Test exam profile creation when user enroll in course.
        """
        # Create a paid final grade to mark user as having paid
        with mute_signals(post_save):
            FinalGradeFactory.create(
                user=self.profile.user,
                course_run=self.course_run,
                passed=True,
                course_run_paid_on_edx=True,
            )
        # There is no ExamProfile before enrollment.
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False

        CachedEnrollmentFactory.create(user=self.profile.user, course_run=self.course_run)
        assert ExamProfile.objects.filter(profile=self.profile).exists() is True

    def test_update_exam_authorization_cached_enrollment_user_not_paid(self):
        """
        Test no exam profile created when user enrolled in the course but their enrollment is verified
        """
        # exam profile before enrollment
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False
        CachedEnrollmentFactory.create(user=self.profile.user, course_run=self.course_run)
        assert ExamProfile.objects.filter(profile=self.profile).exists() is True

    def test_update_exam_authorization_cached_enrollment_when_no_exam_run(self):
        """
        Test no exam profile created when course has no ExamRun
        """
        self.exam_run.delete()
        course = CourseFactory.create(program=self.program)
        course_run = CourseRunFactory.create(
            end_date=now_in_utc() - timedelta(days=100),
            enrollment_end=now_in_utc() + timedelta(hours=1),
            course=course
        )
        # Create a paid final grade to mark user as having paid
        FinalGradeFactory.create(
            user=self.profile.user,
            course_run=course_run,
            passed=True,
            course_run_paid_on_edx=True,
        )

        # exam profile before enrollment.
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False
        CachedEnrollmentFactory.create(user=self.profile.user, course_run=course_run)
        assert ExamProfile.objects.filter(profile=self.profile).exists() is False
