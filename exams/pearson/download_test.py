"""Pearson SFTP download tests"""
from unittest.mock import (
    call,
    Mock,
    patch,
)

from django.test import SimpleTestCase, override_settings

from exams.pearson.download import (
    ArchivedResponseProcesser,
    get_file_type,
    is_zip_file,
)
from exams.pearson.sftp_test import EXAMS_SFTP_SETTINGS


@override_settings(**EXAMS_SFTP_SETTINGS)
class PearsonDownloadTest(SimpleTestCase):
    """
    Tests for non-connection Pearson download code
    """
    def setUp(self):
        self.sftp = Mock()

    def test_is_zip_file(self):  # pylint: disable=no-self-use
        """Tests is_zip_file"""
        assert is_zip_file('file.zip')
        assert not is_zip_file('file.not')
        assert not is_zip_file('file')

    def test_get_file_type(self):  # pylint: disable=no-self-use
        """Tests get_file_type"""
        assert get_file_type('vcdc-2016-02-08-a.dat') == 'vcdc'
        assert get_file_type('eac-2016-02-08-a.dat') == 'eac'
        assert get_file_type('asdfsad-2016-02-08-a.dat') is None

    def test_fetch_file(self):
        """
        Tests that fetch_file works as expected
        """
        remote_path = 'file.ext'
        expected_local_path = '/tmp/file.ext'
        processor = ArchivedResponseProcesser(self.sftp)

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
        processor = ArchivedResponseProcesser(self.sftp)

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
        processor = ArchivedResponseProcesser(self.sftp)

        get_file_type_mock.return_value = 'eac'
        assert processor.process_extracted_file(extracted_file) == process_eac_file_mock.return_value
        processor.process_eac_file.assert_called_once_with(extracted_file)

        get_file_type_mock.return_value = 'vcdc'
        assert processor.process_extracted_file(extracted_file) == process_vcdc_file_mock.return_value
        processor.process_vcdc_file.assert_called_once_with(extracted_file)

        get_file_type_mock.return_value = None
        assert processor.process_extracted_file(extracted_file) is False
