"""Pearson SFTP download tests"""
from unittest.mock import (
    call,
    MagicMock,
    Mock,
    patch,
)

import ddt
from django.test import SimpleTestCase, override_settings
from paramiko import SSHException

from exams.pearson import download
from exams.pearson.sftp_test import EXAMS_SFTP_SETTINGS


# pylint: disable=too-many-arguments
@ddt.ddt
@override_settings(**EXAMS_SFTP_SETTINGS)
class PearsonDownloadTest(SimpleTestCase):
    """
    Tests for non-connection Pearson download code
    """
    def setUp(self):
        self.sftp = Mock()

    def test_is_zip_file(self):  # pylint: disable=no-self-use
        """Tests is_zip_file"""
        assert download.is_zip_file('file.zip')
        assert not download.is_zip_file('file.not')
        assert not download.is_zip_file('file')

    def test_get_file_type(self):  # pylint: disable=no-self-use
        """Tests get_file_type"""
        assert download.get_file_type('vcdc-2016-02-08-a.dat') == 'vcdc'
        assert download.get_file_type('eac-2016-02-08-a.dat') == 'eac'
        assert download.get_file_type('asdfsad-2016-02-08-a.dat') is None

    def test_fetch_file(self):
        """
        Tests that fetch_file works as expected
        """
        remote_path = 'file.ext'
        expected_local_path = '/tmp/file.ext'
        processor = download.ArchivedResponseProcesser(self.sftp)

        local_path = processor.fetch_file(remote_path)

        assert local_path == expected_local_path
        self.sftp.get.assert_called_once_with(remote_path, localpath=expected_local_path)

    def test_filtered_files(self):
        """
        Test that filtered_files filters on the regex
        """
        listdir_values = ['a.zip', 'b.zip', 'b']
        isfile_values = [True, False, True]
        self.sftp.listdir.return_value = listdir_values
        self.sftp.isfile.side_effect = isfile_values
        processor = download.ArchivedResponseProcesser(self.sftp)

        result = list(processor.filtered_files())

        assert result == [('a.zip', '/tmp/a.zip')]

        self.sftp.listdir.assert_called_once_with()
        assert self.sftp.isfile.call_args_list == [call(arg) for arg in listdir_values]

    @patch('exams.pearson.download.get_file_type')
    @patch('exams.pearson.download.ArchivedResponseProcesser.process_eac_file')
    @patch('exams.pearson.download.ArchivedResponseProcesser.process_vcdc_file')
    def test_process_extracted_file(self, process_vcdc_file_mock, process_eac_file_mock, get_file_type_mock):
        """
        Test that process_extracted_file handles file types correctly
        """
        extracted_file = Mock()
        process_eac_file_mock.return_value = 1
        process_vcdc_file_mock.return_value = 2
        processor = download.ArchivedResponseProcesser(self.sftp)

        get_file_type_mock.return_value = 'eac'
        assert processor.process_extracted_file(extracted_file) == process_eac_file_mock.return_value
        processor.process_eac_file.assert_called_once_with(extracted_file)

        get_file_type_mock.return_value = 'vcdc'
        assert processor.process_extracted_file(extracted_file) == process_vcdc_file_mock.return_value
        processor.process_vcdc_file.assert_called_once_with(extracted_file)

        get_file_type_mock.return_value = None
        assert processor.process_extracted_file(extracted_file) is False

    @ddt.data(
        (['a.file', 'b.file'], [True, True], True),
        (['a.file', 'b.file'], [True, False], False),
        (['a.file', 'b.file'], [False, True], False),
        (['a.file', 'b.file'], [False, False], False),
    )
    @ddt.unpack
    @patch('zipfile.ZipFile', spec=True)
    @patch('exams.pearson.download.ArchivedResponseProcesser.process_extracted_file')
    def test_process_zip(self, files, results, expected_result, process_extracted_file_mock, zip_file_mock):
        """Tests that process_zip behaves correctly"""
        process_extracted_file_mock.side_effect = results
        zip_file_mock.return_value.__enter__.return_value.namelist.return_value = files
        processor = download.ArchivedResponseProcesser(self.sftp)

        assert processor.process_zip('local.zip') == expected_result


@override_settings(**EXAMS_SFTP_SETTINGS)
@patch('os.remove')
@patch('os.path.exists', return_value=True)
@patch(
    'exams.pearson.download.ArchivedResponseProcesser.filtered_files',
    return_value=[
        ('a.zip', '/tmp/a.zip'),
    ]
)
@patch('exams.pearson.download.ArchivedResponseProcesser.process_zip', return_value=True)
class ArchivedResponseProcesserProcessTest(SimpleTestCase):
    """Tests around ArchivedResponseProcesser.process"""
    def setUp(self):
        self.sftp = MagicMock()

    def test_process_success(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test the happy path"""
        processor = download.ArchivedResponseProcesser(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_called_once_with('a.zip')
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    def test_process_failure(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test the unhappy path"""
        process_zip_mock.return_value = False
        processor = download.ArchivedResponseProcesser(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_not_called()
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    def test_process_exception(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test that process() cleans up the local but not the remote on any processing exception"""
        process_zip_mock.side_effect = Exception('exception')

        processor = download.ArchivedResponseProcesser(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_not_called()
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    def test_process_ssh_exception(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test that SSH exceptions bubble up"""
        self.sftp.remove.side_effect = SSHException('exception')

        processor = download.ArchivedResponseProcesser(self.sftp)
        with self.assertRaises(SSHException):
            processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_called_once_with('a.zip')
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    def test_process_missing_local(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test that a missing local file doesn't fail"""
        os_path_exists_mock.return_value = False

        processor = download.ArchivedResponseProcesser(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_called_once_with('a.zip')
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_not_called()
