"""
Management command to recreate the Opensearch index
"""

from django.core.management.base import BaseCommand, CommandError

from micromasters.utils import log, now_in_utc
from search.tasks import start_recreate_index


class Command(BaseCommand):
    """
    Command for recreate_index
    """
    help = "Starts a new celery task that clears existing Opensearch indices and creates a new index and mapping."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Recreates the index
        """
        task = start_recreate_index.delay()
        self.stdout.write(
            f"Started celery task {task} to index content for all indexes"
        )

        self.stdout.write("Waiting on task...")

        start = now_in_utc()
        error = task.get()

        if error:
            raise CommandError(f"Recreate index errored: {error}")
        log.info("recreate_index has finished successfully!")

        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            f"Recreate index finished, took {total_seconds} seconds"
        )
