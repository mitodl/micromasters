"""
Management command to recreate the Elasticsearch index
"""

from django.core.management.base import BaseCommand, CommandError
from search.tasks import start_recreate_index
from micromasters.utils import now_in_utc, log


class Command(BaseCommand):
    """
    Command for recreate_index
    """
    help = "Starts a new celery task that clears existing Elasticsearch indices and creates a new index and mapping."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Recreates the index
        """
        task = start_recreate_index.delay()
        self.stdout.write(
            "Started celery task {task} to index content for all indexes".format(
                task=task
            )
        )

        self.stdout.write("Waiting on task...")

        start = now_in_utc()
        error = task.get()

        if error:
            raise CommandError(f"Recreate index errored: {error}")
        log.info("recreate_index has finished successfully!")

        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Recreate index finished, took {} seconds".format(total_seconds)
        )
