"""Pearson SFTP download tests"""
from datetime import datetime
from unittest.mock import (
    MagicMock,
    Mock,
    call,
    mock_open,
    patch
)

import ddt
import pytest
import pytz
from factory.django import mute_signals
from django.db.models.signals import post_save
from django.test import (
    override_settings,
    SimpleTestCase,
)
from paramiko import SSHException

from courses.factories import CourseFactory
from exams.factories import (
    ExamAuthorizationFactory,
    ExamProfileFactory,
)
from exams.models import (
    ExamAuthorization,
    ExamProfile,
)
from exams.pearson.constants import (
    EAC_SUCCESS_STATUS,
    EAC_FAILURE_STATUS,
    VCDC_SUCCESS_STATUS,
    VCDC_FAILURE_STATUS,
    EXAM_GRADE_PASS,
)
from exams.pearson import download
from exams.pearson.exceptions import RetryableSFTPException
from exams.pearson.factories import EXAMResultFactory
from exams.pearson.readers import (
    EACResult,
    VCDCResult,
)
from exams.pearson.sftp_test import EXAMS_SFTP_SETTINGS
from grades.models import ProctoredExamGrade
from micromasters.utils import now_in_utc
from search.base import MockedESTestCase

FIXED_DATETIME = datetime(2016, 5, 15, 15, 2, 55, tzinfo=pytz.UTC)


# pylint: disable=too-many-arguments
@ddt.ddt
@pytest.mark.usefixtures('auditor')
@override_settings(**EXAMS_SFTP_SETTINGS)
class PearsonDownloadTest(SimpleTestCase):
    """
    Tests for non-connection Pearson download code
    """
    def setUp(self):
        self.sftp = Mock()

    def test_fetch_file(self):
        """
        Tests that fetch_file works as expected
        """
        remote_path = 'file.ext'
        expected_local_path = '/tmp/file.ext'
        processor = download.ArchivedResponseProcessor(self.sftp)

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
        processor = download.ArchivedResponseProcessor(self.sftp)

        result = list(processor.filtered_files())

        assert result == [('a.zip', '/tmp/a.zip')]

        self.sftp.listdir.assert_called_once_with()
        assert self.sftp.isfile.call_args_list == [call(arg) for arg in listdir_values]

    @patch('exams.pearson.download.ArchivedResponseProcessor.process_eac_file')
    @patch('exams.pearson.download.ArchivedResponseProcessor.process_vcdc_file')
    @patch('exams.pearson.download.ArchivedResponseProcessor.process_exam_file')
    def test_process_extracted_file(self, process_exam_file_mock, process_vcdc_file_mock, process_eac_file_mock):
        """
        Test that process_extracted_file handles file types correctly
        """
        extracted_file = Mock()
        process_eac_file_mock.return_value = (True, ['EAC'])
        process_vcdc_file_mock.return_value = (True, ['VCDC'])
        process_exam_file_mock.return_value = (True, ['EXAM'])
        processor = download.ArchivedResponseProcessor(self.sftp)

        assert processor.process_extracted_file(extracted_file, 'eac-07-04-2016.dat') == (True, ['EAC'])
        processor.process_eac_file.assert_called_once_with(extracted_file)

        assert processor.process_extracted_file(extracted_file, 'vcdc-07-04-2016.dat') == (True, ['VCDC'])
        processor.process_vcdc_file.assert_called_once_with(extracted_file)

        assert processor.process_extracted_file(extracted_file, 'exam-07-04-2016.dat') == (True, ['EXAM'])
        processor.process_exam_file.assert_called_once_with(extracted_file)

        assert processor.process_extracted_file(extracted_file, 'notatype-07-04-2016.dat') == (False, [])

    @ddt.data(
        (['a.file', 'b.file'], [(True, []), (True, [])], True),
        (['a.file', 'b.file'], [(True, []), (False, [])], False),
        (['a.file', 'b.file'], [(False, []), (True, [])], False),
        (['a.file', 'b.file'], [(False, []), (False, [])], False),
    )
    @ddt.unpack
    @patch('zipfile.ZipFile', spec=True)
    @patch('exams.pearson.download.ArchivedResponseProcessor.process_extracted_file')
    def test_process_zip(self, files, results, expected_result, process_extracted_file_mock, zip_file_mock):
        """Tests that process_zip behaves correctly"""
        process_extracted_file_mock.side_effect = results
        zip_file_mock.return_value.__enter__.return_value.namelist.return_value = files

        with patch(
            'exams.pearson.utils.email_processing_failures'
        ) as email_processing_failures_mock, patch(
            'exams.pearson.download.locally_extracted'
        ) as locally_extracted_mock:
            locally_extracted_mock.__enter__.return_value = []
            processor = download.ArchivedResponseProcessor(self.sftp)
            assert processor.process_zip('local.zip') == expected_result

        self.auditor.return_value.audit_response_file.assert_called_once_with('local.zip')
        email_processing_failures_mock.assert_not_called()

    @patch('zipfile.ZipFile', spec=True)
    @patch('exams.pearson.download.ArchivedResponseProcessor.process_extracted_file')
    def test_process_zip_email(self, process_extracted_file_mock, zip_file_mock):
        """Tests that an email is sent if errors returned"""
        process_extracted_file_mock.return_value = (True, ['ERROR'])
        zip_file_mock.return_value.__enter__.return_value.namelist.return_value = ['a.dat']

        with patch(
            'exams.pearson.utils.email_processing_failures'
        ) as email_processing_failures_mock:
            processor = download.ArchivedResponseProcessor(self.sftp)
            processor.process_zip('local.zip')

        self.auditor.return_value.audit_response_file.assert_called_once_with('local.zip')
        email_processing_failures_mock.assert_called_once_with('a.dat', 'local.zip', ['ERROR'])

    @ddt.data(
        (True, 1),
        (False, 0),
    )
    @ddt.unpack
    @patch('os.path.exists')
    @patch('os.remove')
    def test_locally_extracted(self, exists, remove_count, remove_mock, exists_mock):
        """
        Tests that the local file gets removed on error if it exists
        """
        zip_mock = Mock(return_value='path')
        exists_mock.return_value = exists
        with patch('exams.pearson.download.open', mock_open(), create=True) as open_mock:
            open_mock.side_effect = Exception('exception')
            with self.assertRaises(Exception):
                with download.locally_extracted(zip_mock, 'file'):
                    pass
            open_mock.assert_called_once_with(zip_mock.extract.return_value, 'r')

        exists_mock.assert_called_once_with(zip_mock.extract.return_value)

        assert remove_mock.call_count == remove_count

    def test_get_invalid_row_messages(self):
        """Test generation of error messages"""
        processor = download.ArchivedResponseProcessor(self.sftp)

        messages = processor.get_invalid_row_messages([{
            'Prop1': 'str',
            'Prop2': 'bad_int',
        }])

        for msg in messages:
            assert msg.startswith('Unable to parse row')


@override_settings(**EXAMS_SFTP_SETTINGS)
@ddt.ddt
@patch('os.remove')
@patch('os.path.exists', return_value=True)
@patch(
    'exams.pearson.download.ArchivedResponseProcessor.filtered_files',
    return_value=[
        ('a.zip', '/tmp/a.zip'),
    ]
)
@patch('exams.pearson.download.ArchivedResponseProcessor.process_zip', return_value=True)
class ArchivedResponseProcessorProcessTest(SimpleTestCase):
    """Tests around ArchivedResponseProcessor.process"""
    def setUp(self):
        self.sftp = MagicMock()

    def test_process_success(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test the happy path"""
        processor = download.ArchivedResponseProcessor(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_called_once_with('a.zip')
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    def test_process_failure(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test the unhappy path"""
        process_zip_mock.return_value = False
        processor = download.ArchivedResponseProcessor(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_not_called()
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    def test_process_exception(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test that process() cleans up the local but not the remote on any processing exception"""
        process_zip_mock.side_effect = Exception('exception')

        processor = download.ArchivedResponseProcessor(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_not_called()
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    @ddt.data(
        SSHException('exception'),
        EOFError(),
    )
    def test_process_ssh_exception_remove(
            self, exc, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test that SSH exceptions bubble up"""
        self.sftp.remove.side_effect = exc

        processor = download.ArchivedResponseProcessor(self.sftp)
        with self.assertRaises(RetryableSFTPException):
            processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_called_once_with('a.zip')
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_called_once_with('/tmp/a.zip')

    def test_process_ssh_exception_cd(
            self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test that SSH exceptions bubble up"""
        self.sftp.cd.side_effect = SSHException('exception')

        processor = download.ArchivedResponseProcessor(self.sftp)
        with self.assertRaises(RetryableSFTPException):
            processor.process()

        filtered_files_mock.assert_not_called()
        self.sftp.remove.assert_not_called()
        process_zip_mock.assert_not_called()
        os_path_exists_mock.assert_not_called()
        os_remove_mock.assert_not_called()

    def test_process_missing_local(self, process_zip_mock, filtered_files_mock, os_path_exists_mock, os_remove_mock):
        """Test that a missing local file doesn't fail"""
        os_path_exists_mock.return_value = False

        processor = download.ArchivedResponseProcessor(self.sftp)
        processor.process()

        filtered_files_mock.assert_called_once_with()
        self.sftp.remove.assert_called_once_with('a.zip')
        process_zip_mock.assert_called_once_with('/tmp/a.zip')
        os_path_exists_mock.assert_called_once_with('/tmp/a.zip')
        os_remove_mock.assert_not_called()


@override_settings(**EXAMS_SFTP_SETTINGS)
@ddt.ddt
class VCDCDownloadTest(MockedESTestCase):
    """
    Test for Vue Candidate Data Confirmation files (VCDC) files processing.
    """
    @classmethod
    def setUpTestData(cls):
        sftp = Mock()
        cls.now = now_in_utc()
        cls.processor = download.ArchivedResponseProcessor(sftp)
        with mute_signals(post_save):
            cls.success_profiles = ExamProfileFactory.create_batch(2) + [
                ExamProfileFactory.create(profile__id=999, profile__student_id=1000),  # disjoint id and student_id
            ]
            cls.failure_profiles = ExamProfileFactory.create_batch(2)

        cls.success_results = ([
            VCDCResult(
                client_candidate_id=exam_profile.profile.student_id,
                status=VCDC_SUCCESS_STATUS,
                date=cls.now,
                message='',
            ) for exam_profile in cls.success_profiles
        ], [])
        cls.failed_results = ([
            VCDCResult(
                client_candidate_id=cls.failure_profiles[0].profile.student_id,
                status=VCDC_FAILURE_STATUS,
                date=cls.now,
                message='',
            ),
            VCDCResult(
                client_candidate_id=cls.failure_profiles[1].profile.student_id,
                status=VCDC_FAILURE_STATUS,
                date=cls.now,
                message='Bad address',
            ),
        ], [])

        cls.all_results = (
            cls.success_results[0] + cls.failed_results[0],
            cls.success_results[1] + cls.failed_results[1],
        )

    def test_process_result_vcdc(self):
        """
        Test file processing, happy case.
        """

        with patch('exams.pearson.download.VCDCReader.read', return_value=self.success_results):
            assert self.processor.process_vcdc_file("/tmp/file.ext") == (True, [])

        for profile in self.success_profiles:
            profile.refresh_from_db()
            assert profile.status == ExamProfile.PROFILE_SUCCESS

    def test_process_result_vcdc_when_error(self):
        """
        Test situation where we get failure results back
        """

        with patch('exams.pearson.download.VCDCReader.read', return_value=self.all_results):
            result, errors = self.processor.process_vcdc_file("/tmp/file.ext")

        assert result is True
        assert all(error.startswith('ExamProfile sync failed:') for error in errors)
        assert "error='Bad address'" in errors[1]

        for profile in self.success_profiles:
            profile.refresh_from_db()
            assert profile.status == ExamProfile.PROFILE_SUCCESS

        for profile in self.failure_profiles:
            profile.refresh_from_db()
            assert profile.status == ExamProfile.PROFILE_FAILED

    def test_process_result_vcdc_when_invalid_data_in_file(self):
        """Tests for the situation where we don't have a matching record"""
        results = ([
            VCDCResult(
                client_candidate_id=10,
                status=VCDC_SUCCESS_STATUS,
                date=self.now,
                message=''
            ),
            VCDCResult(
                client_candidate_id=11,
                status=VCDC_FAILURE_STATUS,
                date=self.now,
                message='Invalid address'
            )
        ], [])

        with patch('exams.pearson.download.VCDCReader.read', return_value=results):
            result, errors = self.processor.process_vcdc_file("/tmp/file.ext")

        assert result is True
        assert len(errors) == 2
        assert all(error.startswith('Unable to find an ExamProfile record:') for error in errors)

    def test_process_result_vcdc_successful_warning(self):
        """Tests for the situation where we get a success with a warning"""
        message = "WARNING: success doesn't come that easy"
        profile = self.failure_profiles[1].profile
        results = ([
            VCDCResult(
                client_candidate_id=profile.student_id,
                status=VCDC_SUCCESS_STATUS,
                date=self.now,
                message=message,
            ),
        ], [])

        with patch('exams.pearson.download.VCDCReader.read', return_value=results):
            result, errors = self.processor.process_vcdc_file("/tmp/file.ext")

        assert result is True
        assert errors[0].startswith('ExamProfile sync failed:')
        assert "error='{}'".format(message) in errors[0]


@override_settings(**EXAMS_SFTP_SETTINGS)
@ddt.ddt
class EACDownloadTest(MockedESTestCase):
    """
    Test for Exam Authorization Confirmation files (EAC) files processing.
    """
    @classmethod
    def setUpTestData(cls):
        sftp = Mock()
        cls.processor = download.ArchivedResponseProcessor(sftp)
        cls.course = course = CourseFactory.create()
        cls.success_auths = ExamAuthorizationFactory.create_batch(2, course=course)
        cls.failure_auths = ExamAuthorizationFactory.create_batch(2, course=course)

        cls.success_results = ([
            EACResult(
                client_authorization_id=auth.id,
                client_candidate_id=auth.user.profile.student_id,
                date=FIXED_DATETIME,
                status=EAC_SUCCESS_STATUS,
                message='',
            ) for auth in cls.success_auths
        ], [])
        cls.failed_results = ([
            EACResult(
                client_authorization_id=cls.failure_auths[0].id,
                client_candidate_id=cls.failure_auths[0].user.profile.student_id,
                date=FIXED_DATETIME,
                status=EAC_FAILURE_STATUS,
                message='',
            ),
            EACResult(
                client_authorization_id=cls.failure_auths[1].id,
                client_candidate_id=cls.failure_auths[1].user.profile.student_id,
                date=FIXED_DATETIME,
                status=EAC_FAILURE_STATUS,
                message='wrong username',
            ),
        ], [])

        cls.all_results = (
            cls.success_results[0] + cls.failed_results[0],
            cls.success_results[1] + cls.failed_results[1],
        )

    def test_process_result_eac(self):
        """
        Test Exam Authorization Confirmation files (EAC) file processing, happy case.
        """

        with patch('exams.pearson.download.EACReader.read', return_value=self.success_results):
            assert self.processor.process_eac_file("/tmp/file.ext") == (True, [])

        for auth in self.success_auths:
            auth.refresh_from_db()
            assert auth.status == ExamAuthorization.STATUS_SUCCESS

    def test_process_result_eac_when_error(self):
        """
        Test Exam Authorization Confirmation files (EAC) file processing, failure case.
        """

        with patch('exams.pearson.download.EACReader.read', return_value=self.all_results):
            result, errors = self.processor.process_eac_file("/tmp/file.ext")

        assert result is True
        assert all(error.startswith('ExamAuthorization sync failed:') for error in errors)
        assert "error='wrong username'" in errors[1]

        for auth in self.success_auths:
            auth.refresh_from_db()
            assert auth.status == ExamAuthorization.STATUS_SUCCESS

        for auth in self.failure_auths:
            auth.refresh_from_db()
            assert auth.status == ExamAuthorization.STATUS_FAILED

    def test_process_result_eac_when_invalid_data_in_file(self):
        """
        Test Exam Authorization Confirmation files (EAC) file processing, when this is
        record in EAC corresponding to which there in no record in ExamAuthorization model.
        """
        results = ([
            EACResult(
                client_authorization_id=10,
                client_candidate_id=10,
                date=FIXED_DATETIME,
                status=EAC_SUCCESS_STATUS,
                message=''
            ),
            EACResult(
                client_authorization_id=11,
                client_candidate_id=11,
                date=FIXED_DATETIME,
                status=EAC_FAILURE_STATUS,
                message='wrong user name'
            )
        ], [])

        with patch('exams.pearson.download.EACReader.read', return_value=results):
            result, errors = self.processor.process_eac_file("/tmp/file.ext")

        assert result is True
        assert len(errors) == 2
        assert all(error.startswith('Unable to find a matching ExamAuthorization record:') for error in errors)
        assert "error='wrong user name'" in errors[1]


@override_settings(**EXAMS_SFTP_SETTINGS)
@ddt.ddt
class EXAMDownloadTest(MockedESTestCase):
    """
    Test for Exam result files (EXAM) files processing.
    """
    @classmethod
    def setUpTestData(cls):
        cls.processor = download.ArchivedResponseProcessor(Mock())
        cls.course = CourseFactory.create()

    def test_process_result_exam(self):
        """Test that the authorization is marked as taken and a ProctoredExamGrade created"""
        exam_results = []
        auths = []

        # create a bunch of results that are passes
        for auth in ExamAuthorizationFactory.create_batch(5, course=self.course):
            exam_results.append(EXAMResultFactory.create(
                passed=True,
                client_candidate_id=auth.user.profile.student_id,
                client_authorization_id=auth.id,
            ))
            auths.append(auth)

        # create a bunch of results that are failed
        for auth in ExamAuthorizationFactory.create_batch(5, course=self.course):
            exam_results.append(EXAMResultFactory.create(
                failed=True,
                client_candidate_id=auth.user.profile.student_id,
                client_authorization_id=auth.id,
            ))
            auths.append(auth)

        grades = ProctoredExamGrade.objects.filter(course=self.course)
        assert grades.count() == 0

        with patch('exams.pearson.download.EXAMReader.read', return_value=(exam_results, [])):
            assert self.processor.process_exam_file("/tmp/file.ext") == (True, [])

        for auth in auths:
            auth.refresh_from_db()
            assert auth.exam_no_show is False
            assert auth.exam_taken is True

        sorted_exam_results = sorted(exam_results, key=lambda result: result.client_authorization_id)
        sorted_grades = list(grades.order_by('client_authorization_id'))

        assert len(sorted_grades) == len(sorted_exam_results)

        for grade, exam_result in zip(sorted_grades, sorted_exam_results):
            assert grade.exam_date == exam_result.exam_date
            assert grade.passing_score == exam_result.passing_score
            assert grade.grade == exam_result.grade
            assert grade.score == exam_result.score
            assert grade.passed is (exam_result.grade == EXAM_GRADE_PASS)
            assert grade.percentage_grade == float(exam_result.score / 100.0)
            expected_data = dict(exam_result._asdict())  # _asdict() returns an OrderedDict
            expected_data['exam_date'] = expected_data['exam_date'].isoformat()
            assert grade.row_data == expected_data

    def test_process_result_exam_no_show(self):
        """Test process_exam_file against no-show rows"""
        exam_auth = ExamAuthorizationFactory.create(course=self.course)
        exam_result = EXAMResultFactory.create(
            noshow=True,
            client_candidate_id=exam_auth.user.profile.student_id,
            client_authorization_id=exam_auth.id,
        )

        with patch('exams.pearson.download.EXAMReader.read', return_value=([exam_result], [])):
            assert self.processor.process_exam_file("/tmp/file.ext") == (True, [])

        exam_auth.refresh_from_db()
        assert exam_auth.exam_no_show is True
        assert exam_auth.exam_taken is True

        assert not ProctoredExamGrade.objects.filter(course=self.course).exists()
