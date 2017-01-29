"""
Tests for Pearson SFTP
"""
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from ddt import ddt, data
from paramiko import SSHException
from pysftp.exceptions import ConnectionException

from exams.pearson import upload
from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.sftp_test import (
    EXAMS_SFTP_FILENAME,
    EXAMS_SFTP_UPLOAD_DIR,
    EXAMS_SFTP_SETTINGS,
)


@ddt
@override_settings(**EXAMS_SFTP_SETTINGS)
@patch('pysftp.Connection')
class PeasonUploadTest(SimpleTestCase):
    """
    Tests for Pearson upload_tsv
    """

    def test_upload_tsv(self, connection_mock):  # pylint: disable=no-self-use
        """
        Tests that upload uses the correct settings values
        """
        upload.upload_tsv(EXAMS_SFTP_FILENAME)

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
