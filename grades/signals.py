"""
Signals for micromasters course certificates
"""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from grades.models import MicromastersCourseCertificate, FinalGrade, MicromastersProgramCertificate
from grades.api import generate_program_certificate, update_or_create_combined_final_grade, generate_program_letter


@receiver(post_save, sender=MicromastersCourseCertificate, dispatch_uid="coursecertificate_post_save")
def handle_create_coursecertificate(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a MicromastersCourseCertificate model is created
    """
    if created:
        user = instance.user
        program = instance.course.program
        transaction.on_commit(lambda: generate_program_certificate(user, program))


@receiver(post_save, sender=MicromastersProgramCertificate, dispatch_uid="programcertificate_post_save")
def handle_create_programcertificate(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a MicromastersProgramCertificate model is created
    """
    if created:
        user = instance.user
        transaction.on_commit(lambda: generate_program_letter(user, instance.program))


@receiver(post_save, sender=FinalGrade, dispatch_uid="final_grade_post_save")
def handle_create_final_grade(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a FinalGrade model is created or updated
    """
    def _on_transaction_commit():
        """If either are applicable, update/create combined final grade and generate program letter"""
        user = instance.user
        course = instance.course_run.course
        update_or_create_combined_final_grade(user, course)
        if created and not course.program.financial_aid_availability:
            generate_program_letter(instance.user, course.program)

    transaction.on_commit(_on_transaction_commit)
