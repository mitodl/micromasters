"""
Signals for exams
"""
import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from dashboard.models import CachedEnrollment
from dashboard.utils import get_mmtrack
from exams.api import authorize_user_for_schedulable_exam_runs
from exams.models import ExamProfile, ExamRun
from exams.utils import is_eligible_for_exam
from grades.api import update_existing_combined_final_grade_for_exam_run
from grades.models import FinalGrade

log = logging.getLogger(__name__)


@receiver(post_save, sender=ExamRun, dispatch_uid="update_exam_run")
def update_exam_run(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """If we update an ExamRun, update ExamAuthorizations accordingly"""
    if not created:
        transaction.on_commit(lambda: update_existing_combined_final_grade_for_exam_run(instance))


@receiver(post_save, sender=FinalGrade, dispatch_uid="update_exam_authorization_final_grade")
def update_exam_authorization_final_grade(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger an exam profile and authorization for FinalGrade creation.
    """
    authorize_user_for_schedulable_exam_runs(instance.user, instance.course_run)


@receiver(post_save, sender=CachedEnrollment, dispatch_uid="update_exam_authorization_cached_enrollment")
def update_exam_authorization_cached_enrollment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger an exam profile when user enroll in a course.
    """
    mmtrack = get_mmtrack(instance.user, instance.course_run.course.program)
    if is_eligible_for_exam(mmtrack, instance.course_run):
        # ensure an exam profile exists when the course has an associated exam
        ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)
