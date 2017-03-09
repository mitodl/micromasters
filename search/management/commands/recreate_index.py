"""
Management command to recreate the Elasticsearch index
"""
import logging

from django.core.management.base import BaseCommand

from search.indexing_api import (
    recreate_index,
    __name__ as indexing_api_name,
)


class Command(BaseCommand):
    """
    Command for recreate_index
    """
    help = "Clears existing Elasticsearch indices and creates a new index and mapping."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Recreates the index
        """
        log = logging.getLogger(indexing_api_name)
        console = logging.StreamHandler(self.stderr)
        console.setLevel(logging.DEBUG)
        log.addHandler(console)
        log.level = logging.INFO

        recreate_index()
