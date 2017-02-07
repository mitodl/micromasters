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

from exams.pearson.exceptions import RetryableSFTPException
from exams.factories import (
    ExamAuthorizationFactory,
    ExamProfileFactory,
)
from exams.models import (
    ExamAuthorization,
    ExamProfile,
)
from exams.tasks import (
    _backoff,
    export_exam_authorizations,
    export_exam_profiles,
)


@override_settings(FEATURES={"PEARSON_EXAMS_SYNC": True})
@ddt
class ExamTasksTest(TestCase):
    """
    Tests for exam tasks
    """
    @data(
        (5, 1, 5),
        (5, 2, 25),
        (5, 3, 125),
    )
    @unpack
    def test_backoff(self, base, retries, expected):
        """
        Test that _backoff is a power of settings.EXAMS_SFTP_BACKOFF_BASE
        """
        with self.settings(EXAMS_SFTP_BACKOFF_BASE=base):
            assert _backoff(retries) == expected

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
    def test_task_improperly_config_logged(self, task, expected_warning_message):
        """
        Verify that when a ImproperlyConfigured error occurs that the task logs exception
        """
        with patch("exams.tasks.log") as log, patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            upload_tsv_mock.side_effect = ImproperlyConfigured()
            task.delay()

        log.exception.assert_called_with(expected_warning_message)

    @override_settings(FEATURES={"PEARSON_EXAMS_SYNC": False})
    @data(export_exam_authorizations, export_exam_profiles)
    def test_task_not_run_on_feature_flag(self, task):
        """Test that tasks do not run when feature flag `PEARSON_EXAMS_SYNC` is off"""
        with patch('exams.pearson.upload.upload_tsv') as upload_tsv_mock:
            task.delay()

        assert upload_tsv_mock.called is False


@override_settings(FEATURES={"PEARSON_EXAMS_SYNC": True})
class ExamProfileTasksTest(TestCase):
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

    @patch('exams.pearson.upload.upload_tsv')
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
            assert isinstance(qs, QuerySet)

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


@override_settings(FEATURES={"PEARSON_EXAMS_SYNC": True})
class ExamAuthorizationTasksTest(TestCase):
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

        in_progress_auths = ExamAuthorization.objects.filter(status=ExamAuthorization.STATUS_IN_PROGRESS)

        assert in_progress_auths.count() == 10

        for exam_auth in self.exam_auths:
            assert exam_auth in in_progress_auths
