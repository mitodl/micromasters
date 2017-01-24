"""Pearson SFTP download tests"""
import datetime
from unittest.mock import (
    call,
    Mock,
    patch
)
import pytz

import ddt
from django.db.models.signals import post_save
from django.test import (
    override_settings,
    SimpleTestCase,
    TestCase
)
from factory.django import mute_signals

from courses.factories import CourseFactory
from exams.models import ExamAuthorization
from exams.pearson.constants import (
    EAC_SUCCESS_STATUS,
    EAC_FAILURE_STATUS
)
from exams.pearson.download import (
    ArchivedResponseProcesser,
    get_file_type,
    is_zip_file,
)
from exams.pearson.sftp_test import EXAMS_SFTP_SETTINGS
from seed_data.utils import add_year
from profiles.factories import UserFactory


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


@override_settings(
    MICROMASTERS_ADMIN_EMAIL='admin@example.com',
    **EXAMS_SFTP_SETTINGS
)
@ddt.ddt
class EACDownloadTest(TestCase):
    """
    Test for Exam Authorization Confirmation files (EAC) files processing.
    """
    @classmethod
    def setUpTestData(cls):
        cls.now = now = datetime.datetime.now(tz=pytz.UTC)
        sftp = Mock()
        cls.processor = ArchivedResponseProcesser(sftp)

        with mute_signals(post_save):
            user1 = UserFactory(username="user_1")
            user2 = UserFactory(username="user_2")

        cls.course = course = CourseFactory.create()
        for idx, user in enumerate([user1, user2]):
            ExamAuthorization.objects.create(
                id=idx+1,
                user=user,
                course=course,
                date_first_eligible=now,
                date_last_eligible=add_year(now)
            )

    def test_process_result_eac(self):
        """
        Test Exam Authorization Confirmation files (EAC) file processing, happy case.
        """
        results = [
            {
                "exam_authorization_id": "000001",
                "candidate_id": "000001",
                "status": EAC_SUCCESS_STATUS,
                "message": ''
            },
            {
                "exam_authorization_id": "000002",
                "candidate_id": "000002",
                "status": EAC_SUCCESS_STATUS,
                "message": ''
            }
        ]

        with patch('exams.pearson.download.EACReader.read', return_value=results), patch(
            "exams.pearson.download.MailgunClient.send_individual_email"
        ) as send_email:
            self.assertTrue(self.processor.process_eac_file("/tmp/file.ext"))
            assert send_email.call_count == 0
            assert ExamAuthorization.objects.get(id=1).status == ExamAuthorization.STATUS_SUCCESS
            assert ExamAuthorization.objects.get(id=2).status == ExamAuthorization.STATUS_SUCCESS

    @ddt.data(
        (
            '',
            "- Exam authorization fail for user `user_3` with authorization id `000003`"
        ),
        (
            'wrong username',
            "- Exam authorization fail for user `user_3` with authorization id `000003`. "
            "Got an error: 'wrong username'"
        )
    )
    @ddt.unpack
    def test_process_result_eac_when_error(self, error_message, summary_point):
        """
        Test Exam Authorization Confirmation files (EAC) file processing, failure case.
        """
        with mute_signals(post_save):
            user3 = UserFactory(username="user_3")
        ExamAuthorization.objects.create(
            id=3,
            user=user3,
            course=self.course,
            date_first_eligible=self.now,
            date_last_eligible=add_year(self.now)
        )
        results = [
            {
                "exam_authorization_id": "000001",
                "candidate_id": "000001",
                "status": EAC_SUCCESS_STATUS,
                "message": ''
            },
            {
                "exam_authorization_id": "000002",
                "candidate_id": "000002",
                "status": EAC_SUCCESS_STATUS,
                "message": ''
            },
            {
                "exam_authorization_id": "000003",
                "candidate_id": "000003",
                "status": EAC_FAILURE_STATUS,
                "message": error_message
            }
        ]

        with patch('exams.pearson.download.EACReader.read', return_value=results), patch(
            "exams.pearson.download.MailgunClient.send_individual_email"
        ) as send_email:
            self.assertTrue(self.processor.process_eac_file("/tmp/file.ext"))
            assert ExamAuthorization.objects.get(id=1).status == ExamAuthorization.STATUS_SUCCESS
            assert ExamAuthorization.objects.get(id=2).status == ExamAuthorization.STATUS_SUCCESS
            assert ExamAuthorization.objects.get(id=3).status == ExamAuthorization.STATUS_FAILED

            assert send_email.call_count == 1
            assert send_email.call_args[0][0] == "Summary of failures of file='file.ext'"
            assert summary_point in send_email.call_args[0][1]

    def test_process_result_eac_when_invalid_data_in_file(self):
        """
        Test Exam Authorization Confirmation files (EAC) file processing, when this is
        record in EAS corresponding to which there in no record in ExamAuthorization model.
        """
        results = [
            {
                "exam_authorization_id": "000001",
                "candidate_id": "000001",
                "status": EAC_SUCCESS_STATUS,
                "message": ''
            },
            {
                "exam_authorization_id": "000002",
                "candidate_id": "000002",
                "status": EAC_SUCCESS_STATUS,
                "message": ''
            },
            {
                "exam_authorization_id": "000003",
                "candidate_id": "000003",
                "status": EAC_FAILURE_STATUS,
                "message": 'wrong user name'
            }
        ]

        with patch('exams.pearson.download.EACReader.read', return_value=results), patch(
            "exams.pearson.download.MailgunClient.send_individual_email"
        ) as send_email:
            self.assertTrue(self.processor.process_eac_file("/tmp/file.ext"))
            assert ExamAuthorization.objects.get(id=1).status == ExamAuthorization.STATUS_SUCCESS
            assert ExamAuthorization.objects.get(id=2).status == ExamAuthorization.STATUS_SUCCESS

            assert send_email.call_count == 1
            assert send_email.call_args[0][0] == "Summary of failures of file='file.ext'"
            assert (
                "- Unable to find information for authorization_id: `000003` and candidate_id: `000003` "
                "in our system.\n" in send_email.call_args[0][1]
            )
