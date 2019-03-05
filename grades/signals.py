"""
Signals for micromasters course certificates
"""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from grades.models import MicromastersCourseCertificate, ProctoredExamGrade, FinalGrade
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


@receiver(post_save, sender=MicromastersCourseCertificate, dispatch_uid="coursecertificate_post_save_for_letters")
def handle_for_createprogram_letters(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a MicromastersCourseCertificate model is created
    """
    if created:
        user = instance.user
        program = instance.course.program
        if not program.financial_aid_availability:
            transaction.on_commit(lambda: generate_program_letter(user, program))


@receiver(post_save, sender=ProctoredExamGrade, dispatch_uid="examgrade_post_save")
def handle_create_exam_grade(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a ProctoredExamGrade model is created or updated
    """
    transaction.on_commit(lambda: update_or_create_combined_final_grade(instance.user, instance.course))


@receiver(post_save, sender=FinalGrade, dispatch_uid="final_grade_post_save")
def handle_create_final_grade(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a FinalGrade model is created or updated
    """
    transaction.on_commit(lambda: update_or_create_combined_final_grade(instance.user, instance.course_run.course))
