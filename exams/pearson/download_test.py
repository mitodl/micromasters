"""Pearson SFTP download tests"""
from unittest.mock import Mock

from django.test import SimpleTestCase, override_settings

from exams.pearson import download
from exams.pearson.sftp_test import EXAMS_SFTP_SETTINGS


@override_settings(**EXAMS_SFTP_SETTINGS)
class PeasonUploadTest(SimpleTestCase):
    """
    Tests for non-connection Pearson download code
    """
    def test_fetch_file(self):  # pylint: disable=no-self-use
        """
        Tests that fetch_file works as expected
        """
        sftp = Mock()
        remote_path = 'file.ext'
        expected_local_path = '/tmp/file.ext'

        local_path = download.fetch_file(sftp, remote_path)

        assert local_path == expected_local_path
        sftp.get.assert_called_once_with(remote_path, localpath=expected_local_path)
