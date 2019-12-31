"""
Signals for exams
"""
import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver


from courses.models import CourseRun
from dashboard.models import CachedEnrollment
from dashboard.utils import get_mmtrack
from ecommerce.models import Order
from exams.api import authorize_user_for_schedulable_exam_runs
from exams.models import (
    ExamProfile,
    ExamRun,
)
from exams.utils import is_eligible_for_exam

from exams import tasks
from grades.api import update_existing_combined_final_grade_for_exam_run
from grades.models import FinalGrade
from profiles.models import Profile


log = logging.getLogger(__name__)


@receiver(post_save, sender=Profile, dispatch_uid="update_exam_profile")
def update_exam_profile(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger a sync of the profile if an ExamProfile record exists for it.
    """
    ExamProfile.objects.filter(profile_id=instance.id).update(status=ExamProfile.PROFILE_PENDING)


@receiver(post_save, sender=ExamRun, dispatch_uid="update_exam_run")
def update_exam_run(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """If we update an ExamRun, update ExamAuthorizations accordingly"""
    if not created:
        tasks.update_exam_run.delay(instance.id)
        transaction.on_commit(lambda: update_existing_combined_final_grade_for_exam_run(instance))


@receiver(post_save, sender=FinalGrade, dispatch_uid="update_exam_authorization_final_grade")
def update_exam_authorization_final_grade(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger an exam profile and authorization for FinalGrade creation.
    """
    authorize_user_for_schedulable_exam_runs(instance.user, instance.course_run)


@receiver(post_save, sender=Order, dispatch_uid="authorize_exams_order")
def update_exam_authorization_order(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger an exam profile and authorization for Order fulfillment.
    """
    if not Order.is_fulfilled(instance.status):
        return

    paid_edx_course_keys = instance.line_set.values_list('course_key', flat=True)

    for course_run in CourseRun.objects.filter(
            edx_course_key__in=paid_edx_course_keys
    ).select_related('course__program'):
        authorize_user_for_schedulable_exam_runs(instance.user, course_run)


@receiver(post_save, sender=CachedEnrollment, dispatch_uid="update_exam_authorization_cached_enrollment")
def update_exam_authorization_cached_enrollment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger an exam profile when user enroll in a course.
    """
    mmtrack = get_mmtrack(instance.user, instance.course_run.course.program)
    if is_eligible_for_exam(mmtrack, instance.course_run):
        # if user paid for a course then create his exam profile if it is not created yet.
        ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)
