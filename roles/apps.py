"""
AppConfig
"""
from django.apps import AppConfig


class RolesConfig(AppConfig):
    """
    App config for this app
    """
    name = "roles"

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import roles.signals  # pylint: disable=unused-import
