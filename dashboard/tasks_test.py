"""
Tests for tasks
"""
from django.test import (
    override_settings,
    TestCase,
)
from mock import patch

from backends.edxorg import EdxOrgOAuth2
from dashboard.tasks import (
    batch_update_user_data,
    batch_update_user_data_subtasks
)
from profiles.factories import UserFactory

# pylint: disable=no-self-use


class TasksTest(TestCase):
    """
    Tests for periodic task which is for updating user data from edx.
    """

    @classmethod
    def setUpTestData(cls):
        super(TasksTest, cls).setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        cls.user2 = UserFactory.create()

        # create a social auth for the user
        for user in [cls.user, cls.user2]:
            user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid="{}_edx".format(user.username),
                extra_data='{"access_token": "fooooootoken"}'
            )

    def setUp(self):
        super(TasksTest, self).setUp()
        self.students = [self.user.id, self.user2.id]

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_celery_task_works(self):
        """
        Assert task schedule using celery beat.
        """
        self.assertTrue(batch_update_user_data.delay())

    @override_settings(CELERY_ALWAYS_EAGER=True)
    @patch('dashboard.api.get_student_current_grades', autospec=True)
    @patch('dashboard.api.get_student_enrollments', autospec=True)
    @patch('dashboard.api.get_student_certificates', autospec=True)
    @patch('backends.utils.refresh_user_token', autospec=True)
    def test_student_enrollments_called_task(
            self, mocked_refresh, mocked_get_enrollments, mocked_get_certificates, mocked_get_current_grades):
        """
        Assert get_student_enrollments is actually called
        """
        batch_update_user_data_subtasks.s(self.students).apply(args=()).get()
        assert mocked_get_enrollments.called
        assert mocked_get_certificates.called
        assert mocked_get_current_grades.called
        assert mocked_refresh.called
