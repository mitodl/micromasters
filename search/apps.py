"""
AppConfig
"""
from django.apps import AppConfig


class SearchConfig(AppConfig):
    """
    App config for this app
    """
    name = "search"

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import search.signals  # pylint: disable=unused-import
