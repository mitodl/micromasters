
"""
Tests for Pearson SFTP
"""
from unittest.mock import (
    ANY,
    patch,
)

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings
from ddt import ddt, data

from exams.pearson.constants import PEARSON_UPLOAD_REQUIRED_SETTINGS
from exams.pearson.sftp import get_connection


EXAMS_SFTP_FILENAME = 'FILENAME'
EXAMS_SFTP_HOST = 'l0calh0st'
EXAMS_SFTP_PORT = '345'
EXAMS_SFTP_USERNAME = 'username'
EXAMS_SFTP_PASSWORD = 'password'
EXAMS_SFTP_UPLOAD_DIR = 'tmp'
EXAMS_SFTP_RESULTS_DIR = '/tmp'
EXAMS_SFTP_SETTINGS = {
    'EXAMS_SFTP_HOST': EXAMS_SFTP_HOST,
    'EXAMS_SFTP_PORT': EXAMS_SFTP_PORT,
    'EXAMS_SFTP_USERNAME': EXAMS_SFTP_USERNAME,
    'EXAMS_SFTP_PASSWORD': EXAMS_SFTP_PASSWORD,
    'EXAMS_SFTP_UPLOAD_DIR': EXAMS_SFTP_UPLOAD_DIR,
    'EXAMS_SFTP_RESULTS_DIR': EXAMS_SFTP_RESULTS_DIR,
}


@ddt
@override_settings(**EXAMS_SFTP_SETTINGS)
@patch('pysftp.Connection')
class PeasonSFTPTest(SimpleTestCase):
    """
    Tests for Pearson upload_tsv
    """

    def test_get_connection_settings(self, connection_mock):  # pylint: disable=no-self-use
        """
        Tests that get_connection calls psftp.Connection with the correct values
        """
        connection = get_connection()
        connection_mock.assert_called_once_with(
            host=EXAMS_SFTP_HOST,
            port=int(EXAMS_SFTP_PORT),
            username=EXAMS_SFTP_USERNAME,
            password=EXAMS_SFTP_PASSWORD,
            cnopts=ANY,
        )

        assert connection == connection_mock.return_value

    @data(*PEARSON_UPLOAD_REQUIRED_SETTINGS)
    def test_get_connection_missing_settings(self, settings_key, connection_mock):
        """
        Tests that get_connection ImproperlyConfigured if settings.{0} is not set
        """
        kwargs = {settings_key: None}

        with self.settings(**kwargs):
            with self.assertRaises(ImproperlyConfigured) as cm:
                get_connection()

            connection_mock.assert_not_called()
            assert settings_key in cm.exception.args[0]
