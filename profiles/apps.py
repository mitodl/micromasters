"""
AppConfig
"""
from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    """
    App config for this app
    """
    name = "profiles"

    def ready(self):
        """
        Ready handler. Import signals.
        """
        import profiles.signals  # pylint: disable=unused-import
