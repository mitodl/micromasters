"""Tests for simulate_sftp_responses"""
from unittest.mock import (
    ANY,
    MagicMock,
    patch,
)

from django.test import (
    TestCase,
    override_settings,
)

from exams.management.commands import simulate_sftp_responses
from micromasters.utils import now_in_utc


class SimulateSftpResponsesTest(TestCase):
    """Tests for simulate_sftp_responses"""

    @patch('exams.pearson.sftp.get_connection')
    @patch('exams.management.commands.simulate_sftp_responses.Command.handle_ead')
    @patch('exams.management.commands.simulate_sftp_responses.Command.handle_cdd')
    def test_handle_poll(self, handle_cdd_mock, handle_ead_mock, get_connection_mock):
        """Test that handle_poll handles ead and cdd files"""
        sftp_mock = get_connection_mock.return_value.__enter__.return_value
        sftp_mock.listdir.return_value = ['ead', 'cdd', 'zzz']
        sftp_mock.isfile.return_value = [True, True, True]

        cmd = simulate_sftp_responses.Command()
        cmd.handle_poll(0.5, False)

        get_connection_mock.assert_called_once_with()

        sftp_mock.cd.assert_called_once_with(ANY)
        sftp_mock.listdir.assert_called_once_with()

        handle_ead_mock.assert_called_once_with(sftp_mock, 'ead', 0.5)
        handle_cdd_mock.assert_called_once_with(sftp_mock, 'cdd', 0.5)

    @patch('csv.DictReader')
    @patch('exams.management.commands.simulate_sftp_responses.Command.write_zip')
    def test_handle_cdd(self, write_zip_mock, dict_reader_mock):
        """Test that handle_cdd writes a zip file"""
        sftp_mock = MagicMock()

        dict_reader_mock.return_value = [{
            'ClientCandidateID': 1,
        }]

        cmd = simulate_sftp_responses.Command()
        with patch('time.sleep'):  # don't slow down tests
            cmd.handle_cdd(sftp_mock, 'file', False)

        sftp_mock.open.assert_called_once_with('file', mode='r')
        write_zip_mock.assert_called_once_with(sftp_mock, ANY, ANY, ANY)

    @patch('csv.DictReader')
    @patch('exams.management.commands.simulate_sftp_responses.Command.write_zip')
    def test_handle_ead(self, write_zip_mock, dict_reader_mock):
        """Test that handle_ead writes a zip file"""
        sftp_mock = MagicMock()

        dict_reader_mock.return_value = [{
            'ClientAuthorizationID': 2,
            'ClientCandidateID': 1,
        }]

        cmd = simulate_sftp_responses.Command()
        with patch('time.sleep'):  # don't slow down tests
            cmd.handle_ead(sftp_mock, 'file', False)

        sftp_mock.open.assert_called_once_with('file', mode='r')
        write_zip_mock.assert_called_once_with(sftp_mock, ANY, ANY, ANY)

    @override_settings(
        EXAMS_SFTP_RESULTS_DIR='/results',
    )
    @patch('zipfile.ZipFile')
    def test_write_zip(self, zip_file_mock):
        """Test that write_zip writes a zip file"""
        sftp_mock = MagicMock()

        cmd = simulate_sftp_responses.Command()
        cmd.write_zip(sftp_mock, 'data string', 'file.dat', now_in_utc())

        zip_file_mock.assert_called_once_with(ANY, 'w')
        zf_mock = zip_file_mock.return_value.__enter__.return_value
        zf_mock.writestr.assert_called_once_with('file.dat', 'data string')

        sftp_mock.cd.assert_called_once_with('/results')
        sftp_mock.put.assert_called_once_with(ANY)
