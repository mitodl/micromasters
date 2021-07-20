"""
Deletes a set of realistic users/programs that were added to help us test search functionality
"""
from contextlib import contextmanager
from factory.django import mute_signals
from django.core.management import BaseCommand
from django.db import connection
from django.db.models import Q
from django.db.models.signals import post_delete
from django.contrib.auth.models import User

from courses.models import Program
from dashboard.models import CachedEnrollment, CachedCertificate, CachedCurrentGrade
from financialaid.models import FinancialAid, FinancialAidAudit, Tier, TierProgram
from grades.models import FinalGrade
from mail.models import FinancialAidEmailAudit
from search.tasks import start_recreate_index
from seed_data.management.commands import (  # pylint: disable=import-error
    FAKE_USER_USERNAME_PREFIX,
    FAKE_PROGRAM_DESC_PREFIX,
)


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
            cursor.execute("DROP RULE delete_protect ON {}".format(table_name))
        try:
            yield
        finally:
            for table_name in reversed(table_names):
                cursor.execute("CREATE RULE delete_protect AS ON DELETE TO {} DO INSTEAD NOTHING".format(table_name))


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
    fake_tier_ids = (
        TierProgram.objects
        .filter(program__id__in=fake_program_ids)
        .values_list('tier__id', flat=True)
    )
    fake_final_grade_ids = (
        FinalGrade.objects
        .filter(course_run__course__program__id__in=fake_program_ids)
        .values_list('id', flat=True)
    )
    financial_aid_ids = (
        FinancialAid.objects
        .filter(Q(user_id__in=fake_user_ids) | Q(tier_program__program__id__in=fake_program_ids))
        .values_list('id', flat=True)
    )
    fin_aid_audit_models = [FinancialAidAudit, FinancialAidEmailAudit]
    with mute_signals(post_delete):
        with remove_delete_protection(*fin_aid_audit_models):
            for audit_model in fin_aid_audit_models:
                audit_model.objects.filter(financial_aid__id__in=financial_aid_ids).delete()
        for model_cls in [CachedEnrollment, CachedCertificate, CachedCurrentGrade]:
            model_cls.objects.filter(course_run__course__program__id__in=fake_program_ids).delete()
        Tier.objects.filter(id__in=fake_tier_ids).delete()
        FinalGrade.objects.filter(id__in=fake_final_grade_ids).delete()
        Program.objects.filter(id__in=fake_program_ids).delete()
        User.objects.filter(id__in=fake_user_ids).delete()


class Command(BaseCommand):
    """
    Delete seeded data from the database, for development purposes.
    """
    help = "Delete seeded data from the database, for development purposes."

    def handle(self, *args, **options):
        unseed_db()
        start_recreate_index.delay().get()
