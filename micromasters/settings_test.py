"""
Validate that our settings functions work
"""

import importlib
import sys
from unittest import mock

from django.conf import settings
from django.test import TestCase


REQUIRED_SETTINGS = {
    "MAILGUN_URL": "mailgun.fake.url",
    "MAILGUN_KEY": "fake_mailgun_key",
    "OPENSEARCH_INDEX": "fake_esindex",
    "OPEN_DISCUSSIONS_SITE_KEY": "fake.key",
}


class TestSettings(TestCase):
    """Validate that settings work as expected."""

    def patch_settings(self, values):
        """Patch the cached settings loaded by EnvParser"""
        with mock.patch.dict("os.environ", values, clear=True):
            settings_dict = self.reload_settings()
        return settings_dict

    def reload_settings(self):
        """
        Reload settings module

        Returns:
            dict: dictionary of the newly reloaded settings ``vars``
        """
        importlib.reload(sys.modules["micromasters.settings"])
        # Restore settings to original settings after test
        return vars(sys.modules["micromasters.settings"])

    def test_server_side_cursors_disabled(self):
        """DISABLE_SERVER_SIDE_CURSORS should be true by default"""
        assert (
            settings.DEFAULT_DATABASE_CONFIG["DISABLE_SERVER_SIDE_CURSORS"]
            is True
        )

    def test_server_side_cursors_enabled(self):
        """DISABLE_SERVER_SIDE_CURSORS should be false if MITXPRO_DB_DISABLE_SS_CURSORS is false"""
        settings_vars = self.patch_settings({**REQUIRED_SETTINGS, "MICROMASTERS_DB_DISABLE_SS_CURSORS": "false"})
        assert settings_vars["DEFAULT_DATABASE_CONFIG"]["DISABLE_SERVER_SIDE_CURSORS"] is False
