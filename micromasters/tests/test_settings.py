"""
Validate that our settings functions work
"""

import importlib
import sys
from unittest import mock

from django.conf import settings
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
import semantic_version

from micromasters.settings import get_var
from search.base import MockedESTestCase


class TestSettings(MockedESTestCase):
    """Validate that settings work as expected."""

    def reload_settings(self):
        """
        Reload settings module with cleanup to restore it.

        Returns:
            dict: dictionary of the newly reloaded settings ``vars``
        """
        importlib.reload(sys.modules['micromasters.settings'])
        # Restore settings to original settings after test
        self.addCleanup(importlib.reload, sys.modules['micromasters.settings'])
        return vars(sys.modules['micromasters.settings'])

    def test_get_var(self):
        """Verify that get_var does the right thing with precedence"""
        # Verify default value
        self.assertEqual(get_var('NOTATHING', 'foobar'), 'foobar')

        with mock.patch.dict(
            'os.environ', {'FOO': 'notbar'}, clear=True
        ):
            self.assertEqual(get_var('FOO', 'lemon'), 'notbar')

        # Verify that types work:
        with mock.patch.dict(
            'os.environ',
            {
                'FOO': 'False',
                'BAR': '[1,2,3]',
            },
            clear=True
        ):
            self.assertFalse(get_var('FOO', True))
            self.assertEqual(get_var('BAR', []), [1, 2, 3])

    def test_s3_settings(self):
        """Verify that we enable and configure S3 with a variable"""
        # Unset, we don't do S3
        with mock.patch.dict('os.environ', {
            'MICROMASTERS_USE_S3': 'False'
        }, clear=True):
            settings_vars = self.reload_settings()
            self.assertNotEqual(
                settings_vars.get('DEFAULT_FILE_STORAGE'),
                'storages.backends.s3boto.S3BotoStorage'
            )

        with self.assertRaises(ImproperlyConfigured):
            with mock.patch.dict('os.environ', {
                'MICROMASTERS_USE_S3': 'True',
            }, clear=True):
                self.reload_settings()

        # Verify it all works with it enabled and configured 'properly'
        with mock.patch.dict('os.environ', {
            'MICROMASTERS_USE_S3': 'True',
            'AWS_ACCESS_KEY_ID': '1',
            'AWS_SECRET_ACCESS_KEY': '2',
            'AWS_STORAGE_BUCKET_NAME': '3',
        }, clear=True):
            settings_vars = self.reload_settings()
            self.assertEqual(
                settings_vars.get('DEFAULT_FILE_STORAGE'),
                'storages.backends.s3boto.S3BotoStorage'
            )

    def test_admin_settings(self):
        """Verify that we configure email with environment variable"""

        with mock.patch.dict('os.environ', {
            'MICROMASTERS_ADMIN_EMAIL': ''
        }, clear=True):
            settings_vars = self.reload_settings()
            self.assertFalse(settings_vars.get('ADMINS', False))

        test_admin_email = 'cuddle_bunnies@example.com'
        with mock.patch.dict('os.environ', {
            'MICROMASTERS_ADMIN_EMAIL': test_admin_email,
        }, clear=True):
            settings_vars = self.reload_settings()
            self.assertEqual(
                (('Admins', test_admin_email),),
                settings_vars['ADMINS']
            )
        # Manually set ADMIN to our test setting and verify e-mail
        # goes where we expect
        settings.ADMINS = (('Admins', test_admin_email),)
        mail.mail_admins('Test', 'message')
        self.assertIn(test_admin_email, mail.outbox[0].to)

    def test_db_ssl_enable(self):
        """Verify that we can enable/disable database SSL with a var"""

        # Check default state is SSL on
        with mock.patch.dict('os.environ', {
            'MICROMASTERS_DB_DISABLE_SSL': ''
        }, clear=True):
            settings_vars = self.reload_settings()
            self.assertEqual(
                settings_vars['DATABASES']['default']['OPTIONS'],
                {'sslmode': 'require'}
            )

        # Check enabling the setting explicitly
        with mock.patch.dict('os.environ', {
            'MICROMASTERS_DB_DISABLE_SSL': 'True'
        }, clear=True):
            settings_vars = self.reload_settings()
            self.assertEqual(
                settings_vars['DATABASES']['default']['OPTIONS'],
                {}
            )

        # Disable it
        with mock.patch.dict('os.environ', {
            'MICROMASTERS_DB_DISABLE_SSL': 'False'
        }, clear=True):
            settings_vars = self.reload_settings()
            self.assertEqual(
                settings_vars['DATABASES']['default']['OPTIONS'],
                {'sslmode': 'require'}
            )

    @staticmethod
    def test_semantic_version():
        """
        Verify that we have a semantic compatible version.
        """
        semantic_version.Version(settings.VERSION)
