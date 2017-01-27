"""
Signals for exams
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from dashboard.models import CachedEnrollment
from dashboard.utils import get_mmtrack
from exams.models import ExamProfile
from exams.utils import (
    authorize_for_exam,
    ExamAuthorizationException,
    is_eligible_for_exam,
)
from grades.models import FinalGrade
from profiles.models import Profile


log = logging.getLogger(__name__)


@receiver(post_save, sender=Profile, dispatch_uid="update_exam_profile")
def update_exam_profile(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger a sync of the profile if an ExamProfile record exists for it.
    """
    ExamProfile.objects.filter(profile_id=instance.id).update(status=ExamProfile.PROFILE_PENDING)


@receiver(post_save, sender=FinalGrade, dispatch_uid="update_exam_authorization_final_grade")
def update_exam_authorization_final_grade(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger an exam profile and authorization for FinalGrade creation.
    """
    mmtrack = get_mmtrack(instance.user, instance.course_run.course.program)
    try:
        authorize_for_exam(mmtrack, instance.course_run)
    except ExamAuthorizationException:
        log.exception(
            'Unable to authorize user: %s for exam on course_id: %s',
            instance.user.username,
            instance.course_run.course.id
        )


@receiver(post_save, sender=CachedEnrollment, dispatch_uid="update_exam_authorization_cached_enrollment")
def update_exam_authorization_cached_enrollment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to trigger an exam profile when user enroll in a course.
    """
    mmtrack = get_mmtrack(instance.user, instance.course_run.course.program)
    if is_eligible_for_exam(mmtrack, instance.course_run):
        # if user paid for a course then create his exam profile if it is not creaated yet.
        ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)
