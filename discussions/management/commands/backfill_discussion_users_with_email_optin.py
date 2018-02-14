"""
Backfills the users
"""
from django.conf import settings
from django.core.management import BaseCommand, CommandError

from discussions.tasks import sync_discussion_users_with_email_optin


class Command(BaseCommand):
    """
    Submits a celery task to backfill the discussion users.
    """
    help = "Submits a celery task to backfill the discussion users with email optin flag."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument

        if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
            raise CommandError('OPEN_DISCUSSIONS_USER_SYNC is set to False (so disabled).')

        sync_discussion_users_with_email_optin.delay()
        self.stdout.write(
            self.style.SUCCESS('Async job to backfill users submitted with there email optin')
        )
