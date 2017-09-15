"""
Signals for micromasters course certificates
"""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from grades.models import MicromastersCourseCertificate
from grades.api import generate_program_certificate


@receiver(post_save, sender=MicromastersCourseCertificate, dispatch_uid="coursecertificate_post_save")
def handle_create_coursecertificate(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    When a MicromastersCourseCertificate model is created
    """
    if created:
        user = instance.final_grade.user
        program = instance.final_grade.course_run.course.program
        transaction.on_commit(lambda: generate_program_certificate(user, program))
