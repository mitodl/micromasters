"""
Management command to clear the Elasticsearch index
"""

from django.core.management.base import BaseCommand

from search.connection import get_default_alias
from search.indexing_api import clear_index


class Command(BaseCommand):
    """
    Command for clear_index
    """
    help = "Clears existing Elasticsearch indices."

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Clear the index
        """
        clear_index(get_default_alias())
