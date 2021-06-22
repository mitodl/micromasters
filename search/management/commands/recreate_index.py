"""
Management command to recreate the Elasticsearch index
"""

from django.core.management.base import BaseCommand

from search.indexing_api import (
    __name__ as indexing_api_name,
)
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
        log = logging.getLogger(indexing_api_name)
        console = logging.StreamHandler(self.stderr)
        console.setLevel(logging.DEBUG)
        log.addHandler(console)
        log.level = logging.INFO

        if kwargs['profile']:
            import cProfile
            import uuid
            profile = cProfile.Profile()
            profile.enable()
            recreate_index_async.delay()
            profile.disable()
            filename = 'recreate_index_{}.profile'.format(uuid.uuid4())
            profile.dump_stats(filename)
            self.stdout.write('Output profiling data to: {}'.format(filename))
        else:
            recreate_index_async.delay()
