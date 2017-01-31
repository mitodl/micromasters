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
from paramiko import SSHException
from pysftp.exceptions import ConnectionException

from exams.pearson import upload
from exams.pearson.constants import PEARSON_UPLOAD_REQUIRED_SETTINGS
from exams.pearson.exceptions import RetryableSFTPException

EXAMS_SFTP_FILENAME = 'FILENAME'
EXAMS_SFTP_HOST = 'l0calh0st'
EXAMS_SFTP_PORT = '345'
EXAMS_SFTP_USERNAME = 'username'
EXAMS_SFTP_PASSWORD = 'password'
EXAMS_SFTP_UPLOAD_DIR = 'tmp'
EXAMS_SFTP_SETTINGS = {
    'EXAMS_SFTP_HOST': EXAMS_SFTP_HOST,
    'EXAMS_SFTP_PORT': EXAMS_SFTP_PORT,
    'EXAMS_SFTP_USERNAME': EXAMS_SFTP_USERNAME,
    'EXAMS_SFTP_PASSWORD': EXAMS_SFTP_PASSWORD,
    'EXAMS_SFTP_UPLOAD_DIR': EXAMS_SFTP_UPLOAD_DIR,
}


@ddt
@override_settings(**EXAMS_SFTP_SETTINGS)
@patch('pysftp.Connection')
class PeasonUploadTest(SimpleTestCase):
    """
    Tests for Pearson upload
    """

    def test_upload_tsv(self, connection_mock):
        """
        Tests that upload uses the correct settings values
        """
        upload.upload_tsv(EXAMS_SFTP_FILENAME)
        connection_mock.assert_called_once_with(
            host=EXAMS_SFTP_HOST,
            port=int(EXAMS_SFTP_PORT),
            username=EXAMS_SFTP_USERNAME,
            password=EXAMS_SFTP_PASSWORD,
            cnopts=ANY,
        )

        ftp_mock = connection_mock.return_value.__enter__.return_value
        ftp_mock.cd.assert_called_once_with(EXAMS_SFTP_UPLOAD_DIR)
        ftp_mock.put.assert_called_once_with(EXAMS_SFTP_FILENAME)

    @data(
        SSHException(),
        ConnectionException('localhost', 22),
    )
    def test_retryable_exceptions(self, expected_exc, connection_mock):
        """
        Test that if {exc_cls} is raised that it results in a RetryableSFTPException
        """
        connection_mock.side_effect = expected_exc
        with self.assertRaises(RetryableSFTPException) as cm:
            upload.upload_tsv(EXAMS_SFTP_FILENAME)

        assert isinstance(cm.exception, RetryableSFTPException)
        assert cm.exception.__cause__ == expected_exc

    @data(*PEARSON_UPLOAD_REQUIRED_SETTINGS)
    def test_upload_tsv_fails_if_settings_missing(self, settings_key, connection_mock):
        """
        Tests that upload raises ImproperlyConfigured if settings.{0} is not set
        """
        kwargs = {settings_key: None}

        with self.settings(**kwargs), patch('pysftp.Connection') as connection_mock:
            with self.assertRaises(ImproperlyConfigured) as cm:
                upload.upload_tsv('file.tsv')

            connection_mock.assert_not_called()
            assert settings_key in cm.exception.args[0]
