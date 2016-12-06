"""
Tests for tasks
"""
from itertools import product
from unittest import mock

from django.test import (
    override_settings,
    TestCase,
)

from backends.edxorg import EdxOrgOAuth2
from dashboard.api_edx_cache import CachedEdxDataApi
from dashboard.tasks import (
    batch_update_user_data,
    batch_update_user_data_subtasks
)
from micromasters.factories import UserFactory

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

        cls.all_users = [cls.user, cls.user2]

        # create a social auth for the user
        for user in cls.all_users:
            user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid="{}_edx".format(user.username),
                extra_data={"access_token": "fooooootoken"}
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
    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_student_enrollments_called_task(
            self, mocked_refresh, mocked_refresh_cache):
        """
        Assert get_student_enrollments is actually called
        """
        batch_update_user_data_subtasks.s(self.students).apply(args=()).get()
        assert mocked_refresh_cache.call_count == len(self.all_users) * len(CachedEdxDataApi.SUPPORTED_CACHES)
        assert mocked_refresh.call_count == len(self.all_users)
        for user, cache_type in product(self.all_users, CachedEdxDataApi.SUPPORTED_CACHES):
            mocked_refresh_cache.assert_any_call(user, mock.ANY, cache_type)
            mocked_refresh.assert_any_call(user.social_auth.get(provider=EdxOrgOAuth2.name))
