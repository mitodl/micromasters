"""Pearson SFTP download tests"""
from unittest.mock import (
    call,
    Mock,
)

from django.test import SimpleTestCase, override_settings

from exams.pearson.download import ArchivedResponseProcesser
from exams.pearson.sftp_test import EXAMS_SFTP_SETTINGS


@override_settings(**EXAMS_SFTP_SETTINGS)
class PearsonDownloadTest(SimpleTestCase):
    """
    Tests for non-connection Pearson download code
    """
    def setUp(self):
        self.sftp = Mock()
        self.processor = ArchivedResponseProcesser(self.sftp)

    def test_fetch_file(self):  # pylint: disable=no-self-use
        """
        Tests that fetch_file works as expected
        """
        remote_path = 'file.ext'
        expected_local_path = '/tmp/file.ext'

        local_path = self.processor.fetch_file(remote_path)

        assert local_path == expected_local_path
        self.sftp.get.assert_called_once_with(remote_path, localpath=expected_local_path)

    def test_filtered_files(self):  # pylint: disable=no-self-use
        """
        Test that filtered_files filters on the regex
        """
        listdir_values = ['a.zip', 'b.zip', 'b']
        isfile_values = [True, False, True]
        self.sftp.listdir.return_value = listdir_values
        self.sftp.isfile.side_effect = isfile_values

        result = list(self.processor.filtered_files())

        assert result == [('a.zip', '/tmp/a.zip')]

        self.sftp.listdir.assert_called_once_with()
        assert self.sftp.isfile.call_args_list == [call(arg) for arg in listdir_values]
