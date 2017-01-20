"""Pearson SFTP download tests"""
import re
from unittest.mock import (
    call,
    Mock,
)

from django.test import SimpleTestCase, override_settings

from exams.pearson import (
    download,
)
from exams.pearson.sftp_test import (
    EXAMS_SFTP_SETTINGS,
    EXAMS_SFTP_RESULTS_DIR,
)


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

    def test_filtered_files(self):  # pylint: disable=no-self-use
        """
        Test that filtered_files filters on the regex
        """
        listdir_values = ['a.ext', 'b.ext', 'b']
        isfile_values = [True, False, True]
        sftp = Mock()
        sftp.listdir.return_value = listdir_values
        sftp.isfile.side_effect = isfile_values

        pattern = re.compile(r'\S+\.ext')

        result = list(download.filtered_files(sftp, pattern))

        assert result == ['a.ext']

        sftp.listdir.assert_called_once_with(EXAMS_SFTP_RESULTS_DIR)
        assert sftp.isfile.call_args_list == [call(arg) for arg in listdir_values]
