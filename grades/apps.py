"""
AppConfig
"""
from django.apps import AppConfig


class GradesConfig(AppConfig):
    """
    App config for this app
    """
    name = "grades"

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import grades.signals  # pylint: disable=unused-variable
