"""Tests for Pearson utils"""
from datetime import datetime
from unittest.mock import patch

from django.test import SimpleTestCase
import ddt
import pytz

from exams.pearson import utils
from exams.pearson.exceptions import UnparsableRowException

FIXED_DATETIME = datetime(2016, 5, 15, 15, 2, 55, tzinfo=pytz.UTC)


@ddt.ddt
class PearsonUtilsTest(SimpleTestCase):
    """Tests for Pearson utils"""
    def test_is_zip_file(self):  # pylint: disable=no-self-use
        """Tests is_zip_file"""
        assert utils.is_zip_file('file.zip') is True
        assert utils.is_zip_file('file.not') is False
        assert utils.is_zip_file('file') is False

    def test_parse_datetime(self):
        """
        Tests that datetimes format correctly according to Pearson spec
        """
        assert utils.parse_datetime('2016/05/15 15:02:55') == FIXED_DATETIME

    @ddt.data(
        ('true', True),
        ('True', True),
        ('TRUE', True),
        ('false', False),
        ('False', False),
        ('FALSE', False),
    )
    @ddt.unpack
    def test_parse_bool_valid(self, value, expected):
        """Tests that it parses bools correctly"""
        assert utils.parse_bool(value) == expected

    def test_parse_bool_invalid(self):
        """Tests that it fails invalid bool values"""
        with self.assertRaises(UnparsableRowException):
            utils.parse_bool('Truerer')

    def test_parse_or_default(self):
        """Tests parse_or_default uses parsed value or default"""
        assert utils.parse_or_default(int, None)('5') == 5
        assert utils.parse_or_default(int, None)('') is None
        assert utils.parse_or_default(int, 4)('') == 4

    @patch('mail.api.MailgunClient')
    def test_email_processing_failures(self, mailgun_client_mock):  # pylint: disable=no-self-use
        """Test email_processing_failures for correct calls and formatting"""

        with self.settings(ADMIN_EMAIL='admin@example.com'):
            utils.email_processing_failures('b.dat', 'a.zip', [
                'ERROR',
                'ERROR2',
            ])

        client_instance = mailgun_client_mock.return_value
        client_instance.send_individual_email.assert_called_once_with(
            "Summary of failures of Pearson file='b.dat'",
            "Hi,\nThe following errors were found in the "
            "file b.dat in a.zip:\n\n"
            "- ERROR\n- ERROR2",
            "admin@example.com"
        )
