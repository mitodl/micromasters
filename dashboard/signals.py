"""
Signals for user profiles
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from dashboard.models import CachedEnrollment, CachedCertificate, ProgramEnrollment
from search.tasks import index_program_enrolled_users, remove_program_enrolled_user


def _index_enrollment(user, program):
    """
    Helper function to index a ProgramEnrollment if one exists for a user and program
    """
    try:
        program_enrollment = ProgramEnrollment.objects.get(user=user, program=program)
        index_program_enrolled_users.delay([program_enrollment])
    except ProgramEnrollment.DoesNotExist:
        pass


@receiver(post_save, sender=ProgramEnrollment, dispatch_uid="programenrollment_post_save")
def handle_create_programenrollment(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a ProgramEnrollment model is created/updated, update index.
    """
    index_program_enrolled_users.delay([instance])


@receiver(post_delete, sender=ProgramEnrollment, dispatch_uid="programenrollment_post_delete")
def handle_delete_programenrollment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    When a ProgramEnrollment model is deleted, update index.
    """
    remove_program_enrolled_user.delay(instance)


@receiver(post_save, sender=CachedEnrollment, dispatch_uid="cachedenrollment_post_save")
def handle_update_enrollment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Create ProgramEnrollment when a CachedEnrollment is created/updated, and update the index.
    """
    _index_enrollment(instance.user, instance.course_run.course.program)


@receiver(post_save, sender=CachedCertificate, dispatch_uid="cachedcertificate_post_save")
def handle_update_certificate(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    When a CachedCertificate model is updated, update index.
    """
    _index_enrollment(instance.user, instance.course_run.course.program)


@receiver(post_delete, sender=CachedEnrollment, dispatch_uid="cachedenrollment_post_delete")
def handle_delete_enrollment(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Update index when CachedEnrollment model instance is deleted.
    """
    _index_enrollment(instance.user, instance.course_run.course.program)


@receiver(post_delete, sender=CachedCertificate, dispatch_uid="cachedcertificate_post_delete")
def handle_delete_certificate(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Update index when CachedCertificate model instance is deleted.
    """
    _index_enrollment(instance.user, instance.course_run.course.program)
