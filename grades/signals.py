"""
Signals for micromasters course certificates
"""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from grades.models import MicromastersCourseCertificate, ProctoredExamGrade
from grades.api import generate_program_certificate, update_combined_final_grade


@receiver(post_save, sender=MicromastersCourseCertificate, dispatch_uid="coursecertificate_post_save")
def handle_create_coursecertificate(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a MicromastersCourseCertificate model is created
    """
    if created:
        user = instance.final_grade.user
        program = instance.final_grade.course_run.course.program
        transaction.on_commit(lambda: generate_program_certificate(user, program))


@receiver(post_save, sender=ProctoredExamGrade, dispatch_uid="examgrade_post_save")
def handle_create_coursecertificate(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a ProctoredExamGrade model is created or updated
    """

    transaction.on_commit(lambda: update_combined_final_grade(instance.user, instance.course))
