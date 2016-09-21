"""
Deletes a set of realistic users/programs that were added to help us test search functionality
"""
from factory.django import mute_signals
from django.core.management import BaseCommand
from django.db.models.signals import post_delete
from django.contrib.auth.models import User
from courses.models import Program
from dashboard.models import CachedEnrollment, CachedCertificate
from profiles.management.commands.gen_realistic_search_data import FAKE_PROGRAM_DESC_PREFIX, FAKE_USER_USERNAME_PREFIX


class Command(BaseCommand):
    """
    Deletes a set of realistic users and programs/courses that were generated to help us test search
    """
    help = "Deletes a set of realistic users and programs/courses that were generated to help us test search"

    def handle(self, *args, **options):
        fake_program_ids = \
            Program.objects.filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX).values_list('id', flat=True)
        with mute_signals(post_delete):
            for model_cls in [CachedEnrollment, CachedCertificate]:
                model_cls.objects.filter(course_run__course__program__id__in=fake_program_ids).delete()
        Program.objects.filter(id__in=fake_program_ids).delete()
        User.objects.filter(username__startswith=FAKE_USER_USERNAME_PREFIX).delete()
