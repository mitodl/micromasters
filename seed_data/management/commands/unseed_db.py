"""
Deletes a set of realistic users/programs that were added to help us test search functionality
"""
from contextlib import contextmanager

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand
from django.db import connection
from django.db.models.signals import post_delete
from factory.django import mute_signals

from courses.models import Program
from dashboard.models import CachedEnrollment, CachedCertificate, CachedCurrentGrade
from grades.models import FinalGrade
from search.tasks import start_recreate_index

User = get_user_model()
from seed_data.management.commands import (  # pylint: disable=import-error
    FAKE_PROGRAM_DESC_PREFIX, FAKE_USER_USERNAME_PREFIX)


@contextmanager
def remove_delete_protection(*models):
    """
    Temporarily removes delete protection on any number of models

    Args:
        *models: One or more models whose tables will have delete protection temporarily removed
    """
    table_names = [model._meta.db_table for model in models]
    with connection.cursor() as cursor:
        for table_name in table_names:
            cursor.execute(f"DROP RULE delete_protect ON {table_name}")
        try:
            yield
        finally:
            for table_name in reversed(table_names):
                cursor.execute(f"CREATE RULE delete_protect AS ON DELETE TO {table_name} DO INSTEAD NOTHING")


def unseed_db():
    """
    Deletes all seed data from the database
    """
    fake_program_ids = (
        Program.objects
        .filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX)
        .values_list('id', flat=True)
    )
    fake_user_ids = (
        User.objects
        .filter(username__startswith=FAKE_USER_USERNAME_PREFIX)
        .values_list('id', flat=True)
    )
    fake_final_grade_ids = (
        FinalGrade.objects
        .filter(course_run__course__program__id__in=fake_program_ids)
        .values_list('id', flat=True)
    )
    with mute_signals(post_delete):
        for model_cls in [CachedEnrollment, CachedCertificate, CachedCurrentGrade]:
            model_cls.objects.filter(course_run__course__program__id__in=fake_program_ids).delete()
        FinalGrade.objects.filter(id__in=fake_final_grade_ids).delete()
        Program.objects.filter(id__in=fake_program_ids).delete()
        User.objects.filter(id__in=fake_user_ids).delete()


class Command(BaseCommand):
    """
    Delete seeded data from the database, for development purposes.
    """
    help = "Delete seeded data from the database, for development purposes."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        unseed_db()
        start_recreate_index()  # pylint: disable=no-value-for-parameter
        self.stdout.write(self.style.SUCCESS("Seed data has been removed from your database."))
