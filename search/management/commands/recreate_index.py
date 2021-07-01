"""
Management command to recreate the Elasticsearch index
"""

from django.core.management.base import BaseCommand
from search.tasks import recreate_index_async


class Command(BaseCommand):
    """
    Command for recreate_index
    """
    help = "Starts a new celery task that clears existing Elasticsearch indices and creates a new index and mapping."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Recreates the index
        """
        recreate_index_task = recreate_index_async.delay()
        self.stdout.write('Running reindexing task with Id: {}'.format(recreate_index_task.id))
