"""Discussions app"""
from django.apps import AppConfig


class DiscussionsConfig(AppConfig):
    """Discussions AppConfig"""
    name = 'discussions'

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import discussions.signals  # pylint: disable=unused-import
