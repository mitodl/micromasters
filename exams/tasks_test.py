"""
Tests for exam tasks
"""
from unittest.mock import patch

from ddt import ddt, data, unpack
from django.core.exceptions import ImproperlyConfigured
from django.db.models.query import QuerySet
from django.db.models.signals import post_save
from django.test import TestCase, override_settings
from factory.django import mute_signals
import pytest

from dashboard.factories import ProgramEnrollmentFactory
from exams.pearson.exceptions import RetryableSFTPException
from exams.factories import (
    ExamAuthorizationFactory,
    ExamProfileFactory,
    ExamRunFactory,
)
from exams.models import (
    ExamAuthorization,
    ExamProfile,
)
from exams.tasks import (
    batch_process_pearson_zip_files,
    export_exam_authorizations,
    export_exam_profiles,
    authorize_exam_runs,
    update_exam_run,
    authorize_enrollment_for_exam_run)
from financialaid.api_test import create_program
from search.base import MockedESTestCase


@override_settings(FEATURES={"PEARSON_EXAMS_SYNC": True})
@pytest.mark.usefixtures('auditor')
@ddt
class ExamTasksTest(TestCase):
    """
    Tests for exam tasks
    """
    @data(
        (export_exam_authorizations, 'exams.tasks.export_exam_authorizations.retry'),
        (export_exam_profiles, 'exams.tasks.export_exam_profiles.retry'),
    )
    @unpack
    def test_task_retry(self, task, task_retry):
        """
        Verify that when a retryable error occurs that the task retries
        """

        with patch(task_retry) as retry, patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            upload_tsv_mock.side_effect = error = RetryableSFTPException()
            task.delay()

        retry.assert_called_once_with(countdown=1, exc=error)
        assert self.auditor.return_value.audit_request_file.call_count == 1

    @data(
        (
            export_exam_authorizations,
            'export_exam_authorizations is improperly configured, please review require settings.'
        ),
        (
            export_exam_profiles,
            'export_exam_profiles is improperly configured, please review require settings.'
        )
    )
    @unpack
    def test_task_upload_improperly_config_logged(self, task, expected_warning_message):
        """
        Verify that when a ImproperlyConfigured error occurs that the task logs exception
        """
        with patch("exams.tasks.log") as log, patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            upload_tsv_mock.side_effect = ImproperlyConfigured()
            task.delay()

        log.exception.assert_called_with(expected_warning_message)
        assert self.auditor.return_value.audit_request_file.call_count == 1

    @data(
        export_exam_authorizations,
        export_exam_profiles,
    )
    def test_task_upload_any_exception_logged(self, task):
        """
        Verify that when a any error occurs that the task logs exception
        """
        with patch("exams.tasks.log") as log, patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            upload_tsv_mock.side_effect = Exception('error')
            task.delay()

        assert log.exception.call_count == 1
        assert self.auditor.return_value.audit_request_file.call_count == 1

    @data(
        export_exam_authorizations,
        export_exam_profiles,
    )
    def test_task_auditor_improperly_config_logged(self, task):
        """
        Verify that when the auditor raises an ImproperlyConfigured error that the task logs exception
        """
        self.auditor.return_value.audit_request_file.side_effect = ImproperlyConfigured()
        with patch("exams.tasks.log") as log, patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            task.delay()

        assert log.exception.call_count == 1
        assert upload_tsv_mock.call_count == 0
        assert self.auditor.return_value.audit_request_file.call_count == 1

    @data(
        export_exam_authorizations,
        export_exam_profiles,
    )
    def test_task_auditor_any_exception_logged(self, task):
        """
        Verify that when the auditor raises any other error that the task logs exception
        """
        self.auditor.return_value.audit_request_file.side_effect = Exception('error')
        with patch("exams.tasks.log") as log, patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            task.delay()

        assert log.exception.call_count == 1
        assert upload_tsv_mock.call_count == 0
        assert self.auditor.return_value.audit_request_file.call_count == 1

    @override_settings(FEATURES={"PEARSON_EXAMS_SYNC": False})
    @data(export_exam_authorizations, export_exam_profiles)
    def test_task_not_run_on_feature_flag(self, task):
        """Test that tasks do not run when feature flag `PEARSON_EXAMS_SYNC` is off"""
        with patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            task.delay()

        assert upload_tsv_mock.called is False
        assert self.auditor.return_value.audit_request_file.call_count == 0


@override_settings(FEATURES={"PEARSON_EXAMS_SYNC": True})
@pytest.mark.usefixtures('auditor')
@patch('exams.pearson.upload.upload_tsv')
class ExamProfileTasksTest(MockedESTestCase):
    """
    Tests for exam profile tasks
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            # valid profiles
            cls.expected_in_progress_profiles = ExamProfileFactory.create_batch(5, status=ExamProfile.PROFILE_PENDING)
            # invalid profiles
            cls.expected_invalid_profiles = ExamProfileFactory.create_batch(5, status=ExamProfile.PROFILE_PENDING)
            cls.all_profiles = cls.expected_in_progress_profiles + cls.expected_invalid_profiles

    def test_export_exam_profiles(self, upload_tsv_mock):
        """
        Verify that export_exam_profiles makes calls to export the pending profiles
        """
        assert ExamProfile.objects.filter(
            status=ExamProfile.PROFILE_PENDING).count() == len(self.all_profiles)

        def side_effect(tsv, qs):
            """
            Use side_effect to assert at call-time because query return values
            mutate by the time export_exam_profiles returns
            """
            assert hasattr(tsv, 'write')
            assert isinstance(qs, list)

            profiles = list(qs)
            assert len(profiles) == 10
            for profile in profiles:
                assert profile in self.all_profiles

            return (self.expected_in_progress_profiles, self.expected_invalid_profiles)

        with patch('exams.pearson.writers.CDDWriter') as cdd_writer_mock_cls:
            cdd_writer_instance = cdd_writer_mock_cls.return_value
            cdd_writer_instance.write.side_effect = side_effect
            export_exam_profiles.delay()

        assert upload_tsv_mock.call_count == 1
        assert 'cdd-' in upload_tsv_mock.call_args[0][0]
        assert upload_tsv_mock.call_args[0][0].endswith('.dat')

        assert cdd_writer_mock_cls.call_count == 1
        assert cdd_writer_instance.write.call_count == 1
        assert self.auditor.return_value.audit_request_file.call_count == 1

        invalid_profiles = ExamProfile.objects.filter(status=ExamProfile.PROFILE_INVALID)
        in_progress_profiles = ExamProfile.objects.filter(status=ExamProfile.PROFILE_IN_PROGRESS)

        assert invalid_profiles.count() == 5
        assert in_progress_profiles.count() == 5

        # invalid profiles should be marked as such
        for exam_profile in self.expected_invalid_profiles:
            assert exam_profile in invalid_profiles

        # valid profiles should be in progress
        for exam_profile in self.expected_in_progress_profiles:
            assert exam_profile in in_progress_profiles

    @patch('exams.tasks.validate_profile', return_value=False, autospec=True)
    def test_writing_only_valid_profiles(self, validate_profile_mock, upload_tsv_mock):
        """
        Verify invalid profiles are not writen to file and set to 'invalid'
        """
        def side_effect(tsv, qs):
            """
            Use side_effect to assert at call-time because query return values
            mutate by the time export_exam_profiles returns
            """
            assert hasattr(tsv, 'write')
            assert isinstance(qs, list)
            assert len(qs) == 0
            return [], []

        with patch('exams.pearson.writers.CDDWriter') as cdd_writer_mock_cls:
            cdd_writer_instance = cdd_writer_mock_cls.return_value
            cdd_writer_instance.write.side_effect = side_effect
            export_exam_profiles.delay()

        assert upload_tsv_mock.call_count == 1
        assert validate_profile_mock.call_count == 10
        assert self.auditor.return_value.audit_request_file.call_count == 1

        invalid_profiles = ExamProfile.objects.filter(status=ExamProfile.PROFILE_INVALID)
        in_progress_profiles = ExamProfile.objects.filter(status=ExamProfile.PROFILE_IN_PROGRESS)

        assert invalid_profiles.count() == 10
        assert in_progress_profiles.count() == 0


@override_settings(FEATURES={"PEARSON_EXAMS_SYNC": True})
@pytest.mark.usefixtures('auditor')
class ExamAuthorizationTasksTest(MockedESTestCase):
    """
    Tests for exam authorization tasks
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.exam_auths = ExamAuthorizationFactory.create_batch(10, status=ExamAuthorization.STATUS_PENDING)

    @patch('exams.pearson.upload.upload_tsv')
    def test_export_exam_authorizations(self, upload_tsv_mock):
        """
        Verify that export_exam_authorizations exports pending exam auths
        """
        assert ExamAuthorization.objects.filter(
            status=ExamAuthorization.STATUS_PENDING).count() == len(self.exam_auths)

        def side_effect(tsv, qs):
            """
            use side_effect to assert at call-time because query return values
            mutate by the time export_exam_authorizations returns
            """
            # was first arg a file-like object?
            assert hasattr(tsv, 'write')
            assert isinstance(qs, QuerySet)

            auths = list(qs)
            assert len(auths) == 10
            for auth in auths:
                assert auth in self.exam_auths

            return (self.exam_auths, [])

        with patch('exams.pearson.writers.EADWriter') as ead_writer_mock_cls:
            ead_writer_instance = ead_writer_mock_cls.return_value
            ead_writer_instance.write.side_effect = side_effect

            export_exam_authorizations.delay()

        assert upload_tsv_mock.call_count == 1
        assert 'ead-' in upload_tsv_mock.call_args[0][0]
        assert upload_tsv_mock.call_args[0][0].endswith('.dat')

        assert ead_writer_mock_cls.call_count == 1
        assert ead_writer_instance.write.call_count == 1
        assert self.auditor.return_value.audit_request_file.call_count == 1

        in_progress_auths = ExamAuthorization.objects.filter(status=ExamAuthorization.STATUS_IN_PROGRESS)

        assert in_progress_auths.count() == 10

        for exam_auth in self.exam_auths:
            assert exam_auth in in_progress_auths


@override_settings(FEATURES={"PEARSON_EXAMS_SYNC": True})
@patch('exams.pearson.download.ArchivedResponseProcessor')
@patch('exams.pearson.sftp.get_connection')
class BatchProcessingTasksTest(TestCase):
    """
    Tests for batch response processing tasks
    """

    def test_batch_process(self, get_connection_mock, processor_mock):  # pylint: disable=no-self-use
        """
        Verify that batch_process_pearson_zip_files works in the happy path
        """

        batch_process_pearson_zip_files()

        get_connection_mock.assert_called_once_with()
        sftp_mock = get_connection_mock.return_value.__enter__.return_value

        processor_mock.assert_called_once_with(sftp_mock)
        processor_mock.return_value.process.assert_called_once_with()

    def test_batch_process_retryable(self, get_connection_mock, processor_mock):  # pylint: disable=no-self-use
        """
        Verify that batch_process_pearson_zip_files doesn't error when a RetryableSFTPException raises
        """
        get_connection_mock.side_effect = RetryableSFTPException("")

        batch_process_pearson_zip_files()

        get_connection_mock.assert_called_once_with()
        processor_mock.assert_not_called()


@ddt
class ExamRunTasksTest(MockedESTestCase):
    """Tests for ExamRun tasks"""

    @patch('exams.api.update_authorizations_for_exam_run')
    def test_update_exam_run(self, update_mock):
        """Test update_exam_run()"""
        exam_run = ExamRunFactory.create()

        update_exam_run(exam_run.id)
        update_exam_run(-exam_run.id)

        update_mock.assert_called_once_with(exam_run)

    @data(True, False)
    @patch('exams.tasks.authorize_for_latest_passed_course')
    def test_authorize_exam_runs(self, authorized, authorize_for_latest_passed_course_mock):
        """Test authorize_exam_runs()"""
        program, _ = create_program()
        course = program.course_set.first()
        enrollment = ProgramEnrollmentFactory.create(program=program)
        current_run = ExamRunFactory.create(course=course, authorized=authorized)
        past_run = ExamRunFactory.create(course=course, scheduling_future=True, authorized=authorized)
        future_run = ExamRunFactory.create(course=course, scheduling_past=True, authorized=authorized)
        authorize_exam_runs()

        if authorized:
            assert authorize_for_latest_passed_course_mock.call_count == 0
        else:
            assert authorize_for_latest_passed_course_mock.call_count == 2

            authorize_for_latest_passed_course_mock.assert_any_call(enrollment.user, current_run)
            authorize_for_latest_passed_course_mock.assert_any_call(enrollment.user, future_run)

            for exam_run in (current_run, future_run):
                exam_run.refresh_from_db()
                assert exam_run.authorized is True
            past_run.refresh_from_db()
            assert past_run.authorized is False

    @patch('exams.tasks.authorize_for_latest_passed_course')
    def test_authorize_enrollment_for_exam_run(self, authorize_for_latest_passed_course_mock):
        """Test authorize_enrollment_for_exam_run()"""
        program, _ = create_program()
        course = program.course_set.first()
        enrollment_1 = ProgramEnrollmentFactory.create(program=program)
        enrollment_2 = ProgramEnrollmentFactory.create(program=program)
        exam_run = ExamRunFactory.create(course=course)

        authorize_enrollment_for_exam_run([enrollment_1.id, enrollment_2.id], exam_run.id)

        assert authorize_for_latest_passed_course_mock.call_count == 2
        authorize_for_latest_passed_course_mock.assert_any_call(enrollment_1.user, exam_run)
        authorize_for_latest_passed_course_mock.assert_any_call(enrollment_2.user, exam_run)
