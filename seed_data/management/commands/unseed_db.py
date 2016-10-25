"""
Deletes a set of realistic users/programs that were added to help us test search functionality
"""
from factory.django import mute_signals
from django.core.management import BaseCommand
from django.db.models.signals import post_delete
from django.contrib.auth.models import User

from courses.models import Program
from dashboard.models import CachedEnrollment, CachedCertificate
from search.indexing_api import recreate_index
from seed_data.management.commands import (  # pylint: disable=import-error
    FAKE_USER_USERNAME_PREFIX, FAKE_PROGRAM_DESC_PREFIX,
)


class Command(BaseCommand):
    """
    Delete seeded data from the database, for development purposes.
    """
    help = "Delete seeded data from the database, for development purposes."

    def handle(self, *args, **options):
        # pylint: disable=bad-continuation
        fake_program_ids = (
            Program.objects
              .filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX)  # noqa
              .values_list('id', flat=True)
        )
        # pylint: enable=bad-continuation

        with mute_signals(post_delete):
            for model_cls in [CachedEnrollment, CachedCertificate]:
                model_cls.objects.filter(course_run__course__program__id__in=fake_program_ids).delete()
            Program.objects.filter(id__in=fake_program_ids).delete()
            User.objects.filter(username__startswith=FAKE_USER_USERNAME_PREFIX).delete()
        recreate_index()
