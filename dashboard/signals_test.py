"""
Tests for signals
"""

from django.db.models.signals import post_save
from django.test import (
    override_settings,
    TestCase,
)
from factory.django import mute_signals
from mock import patch

from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from dashboard.factories import (
    CachedCertificateFactory,
    CachedEnrollmentFactory,
)
from dashboard.models import ProgramEnrollment
from profiles.factories import ProfileFactory


# pylint: disable=no-self-use
# Make sure that any unmocked ES activity results in an error
@override_settings(ELASTICSEARCH_URL="fake")
class IndexingTests(TestCase):
    """
    Test class for signals that index certain objects in Elasticsearch
    """
    @classmethod
    def setUpTestData(cls):
        super(IndexingTests, cls).setUpTestData()
        with mute_signals(post_save):
            cls.user = ProfileFactory.create().user
            cls.program = ProgramFactory.create()
            cls.course = CourseFactory.create(program=cls.program)


class ProgramEnrollmentTests(IndexingTests):
    """
    Test indexing on program enrollment
    """
    def test_create(self):
        """
        Tests that the database is reindexed when a ProgramEnrollment is created
        """
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        mocked.assert_called_once_with([enrollment])

    def test_update(self):
        """
        Tests that the database is reindexed when a ProgramEnrollment is created
        """
        with mute_signals(post_save):
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment.save()
        mocked.assert_called_once_with([enrollment])

    def test_delete(self):
        """
        Tests that if a CachedEnrollment is updated with data=None, the enrollment in the program is not deleted.
        """
        with mute_signals(post_save):
            enrollment = ProgramEnrollment.objects.create(user=self.user, program=self.program)
        with patch('search.tasks._remove_program_enrolled_user', autospec=True) as mocked:
            enrollment.delete()
        mocked.assert_called_once_with(enrollment)


class CachedEnrollmentTests(IndexingTests):
    """Tests for CachedEnrollment"""

    @classmethod
    def setUpTestData(cls):
        super(CachedEnrollmentTests, cls).setUpTestData()

        with mute_signals(post_save):
            cls.program_enrollment = ProgramEnrollment.objects.create(user=cls.user, program=cls.program)
            cls.course_run = CourseRunFactory.create(course=cls.course)
            cls.separate_course_run = CourseRunFactory.create()

    def test_create_linked(self):
        """
        The database is reindexed when a CachedEnrollment is created and linked to a ProgramEnrollment
        """
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            CachedEnrollmentFactory.create(user=self.user, course_run=self.course_run)
        mocked.assert_called_once_with([self.program_enrollment])

    def test_create_unlinked(self):
        """
        The database is not reindexed when a CachedEnrollment is created but not linked to a ProgramEnrollment
        """
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            CachedEnrollmentFactory.create(user=self.user, course_run=self.separate_course_run)
        assert not mocked.called

    def test_update_linked(self):
        """
        The database is reindexed when a CachedEnrollment is updated and linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            enrollment = CachedEnrollmentFactory.create(user=self.user, course_run=self.course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment.save()
        mocked.assert_called_once_with([self.program_enrollment])

    def test_update_unlinked(self):
        """
        The database is not reindexed when a CachedEnrollment is updated but not linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            enrollment = CachedEnrollmentFactory.create(user=self.user, course_run=self.separate_course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment.save()
        assert not mocked.called

    def test_delete_linked(self):
        """
        The database is reindexed when a CachedEnrollment is deleted when linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            enrollment = CachedEnrollmentFactory.create(user=self.user, course_run=self.course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment.delete()
        mocked.assert_called_once_with([self.program_enrollment])

    def test_delete_unlinked(self):
        """
        The database is not reindexed when a CachedEnrollment is deleted when not linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            enrollment = CachedEnrollmentFactory.create(user=self.user, course_run=self.separate_course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            enrollment.delete()
        assert not mocked.called


class CachedCertificateTests(IndexingTests):
    """Tests for CachedCertificate"""

    @classmethod
    def setUpTestData(cls):
        super(CachedCertificateTests, cls).setUpTestData()

        with mute_signals(post_save):
            cls.program_enrollment = ProgramEnrollment.objects.create(user=cls.user, program=cls.program)
            cls.course_run = CourseRunFactory.create(course=cls.course)
            cls.separate_course_run = CourseRunFactory.create()

    def test_create_linked(self):
        """
        The database is reindexed when a CachedCertificate is created and linked to a ProgramEnrollment
        """
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            CachedCertificateFactory.create(user=self.user, course_run=self.course_run)
        mocked.assert_called_once_with([self.program_enrollment])

    def test_create_unlinked(self):
        """
        The database is not reindexed when a CachedCertificate is created but not linked to a ProgramEnrollment
        """
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            CachedCertificateFactory.create(user=self.user, course_run=self.separate_course_run)
        assert not mocked.called

    def test_update_linked(self):
        """
        The database is reindexed when a CachedCertificate is updated and linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            certificate = CachedCertificateFactory.create(user=self.user, course_run=self.course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            certificate.save()
        mocked.assert_called_once_with([self.program_enrollment])

    def test_update_unlinked(self):
        """
        The database is not reindexed when a CachedCertificate is updated but not linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            certificate = CachedCertificateFactory.create(user=self.user, course_run=self.separate_course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            certificate.save()
        assert not mocked.called

    def test_delete_linked(self):
        """
        The database is reindexed when a CachedCertificate is deleted when linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            certificate = CachedCertificateFactory.create(user=self.user, course_run=self.course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            certificate.delete()
        mocked.assert_called_once_with([self.program_enrollment])

    def test_delete_unlinked(self):
        """
        The database is not reindexed when a CachedCertificate is deleted when not linked to a ProgramEnrollment
        """
        with mute_signals(post_save):
            certificate = CachedCertificateFactory.create(user=self.user, course_run=self.separate_course_run)
        with patch('search.tasks._index_program_enrolled_users', autospec=True) as mocked:
            certificate.delete()
        assert not mocked.called
