"""
AppConfig for dashboard app
"""
from django.apps import AppConfig


class DashboardConfig(AppConfig):
    """
    App config for this app
    """
    name = "dashboard"

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import dashboard.signals  # pylint: disable=unused-import
