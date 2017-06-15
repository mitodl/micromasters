"""
Tests for tasks
"""
from itertools import product
from unittest import mock

from django.conf import settings
from django.contrib.auth.models import User

from backends.edxorg import EdxOrgOAuth2
from backends.utils import InvalidCredentialStored
from dashboard.api_edx_cache import CachedEdxDataApi
from dashboard.tasks import (
    batch_update_user_data,
    batch_update_user_data_subtasks
)
from dashboard.factories import UserCacheRefreshTimeFactory
from micromasters.factories import UserFactory
from micromasters.utils import now_in_utc
from search.base import MockedESTestCase


class TasksTest(MockedESTestCase):
    """
    Tests for periodic task which is for updating user data from edx.
    """

    @classmethod
    def setUpTestData(cls):
        super(TasksTest, cls).setUpTestData()
        # create an user
        cls.user1 = UserFactory.create()
        cls.user2 = UserFactory.create()

        cls.all_working_users = [cls.user1, cls.user2]
        cls.students = [user.id for user in cls.all_working_users]

        # create a social auth for the user
        cls.social_infos = {"access_token": "fooooootoken"}
        for user in cls.all_working_users:
            user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid="{}_edx".format(user.username),
                extra_data=cls.social_infos
            )

        cls.user_no_social_auth = UserFactory.create()

    def test_celery_task_works(self):
        """
        Assert task schedule using celery beat.
        """
        self.assertTrue(batch_update_user_data.delay())

    @mock.patch('dashboard.tasks.batch_update_user_data_subtasks.run', autospec=True)
    def test_batch_update_user_date_for_active_users(self, mocked_subtasks):
        """
        Assert batch_update_user_data does not update inactive users
        """
        for user in self.all_working_users:
            user.is_active = False
            user.save()
        now = now_in_utc()
        UserCacheRefreshTimeFactory.create(
            user=self.user2,
            enrollment=now,
            certificate=now,
            current_grade=now,
        )
        batch_update_user_data.delay()
        mocked_subtasks.assert_called_with([self.user_no_social_auth.id])

    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_student_enrollments_called_task(self, mocked_refresh, mocked_refresh_cache):
        """
        Assert get_student_enrollments is actually called in happy path
        """
        batch_update_user_data_subtasks.s([self.user_no_social_auth]+self.students).apply(args=()).get()
        assert mocked_refresh_cache.call_count == len(self.all_working_users) * len(CachedEdxDataApi.SUPPORTED_CACHES)
        assert mocked_refresh.call_count == len(self.all_working_users)
        for user, cache_type in product(self.all_working_users, CachedEdxDataApi.SUPPORTED_CACHES):
            mocked_refresh_cache.assert_any_call(user, mock.ANY, cache_type)
            mocked_refresh.assert_any_call(user.social_auth.get(provider=EdxOrgOAuth2.name))

    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_subtask_user_does_not_exist(self, mocked_refresh, mocked_refresh_cache):
        """
        Test if the user has been deleted between the select and the run of the task,
        the task still completes.
        """
        with mock.patch('django.contrib.auth.models.User.objects.get', autospec=True, side_effect=User.DoesNotExist):
            batch_update_user_data_subtasks.s(self.students).apply(args=()).get()
        assert mocked_refresh.called is False
        assert mocked_refresh_cache.called is False

    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_subtask_user_no_social_auth(self, mocked_refresh, mocked_refresh_cache):
        """
        Test if the user has not a social auth the task still completes
        """
        batch_update_user_data_subtasks.s([self.user_no_social_auth]).apply(args=()).get()
        assert mocked_refresh.called is False
        assert mocked_refresh_cache.called is False

    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_subtask_user_wrong_social_auth(self, mocked_refresh, mocked_refresh_cache):
        """
        Test if the user has a wrong social auth the task still completes
        """
        user_wrong_social_auth = UserFactory.create()
        user_wrong_social_auth.social_auth.create(
            provider='foo_provider',
            uid="{}_edx".format(user_wrong_social_auth.username),
            extra_data={"access_token": "fooooootoken"}
        )
        batch_update_user_data_subtasks.s([user_wrong_social_auth]).apply(args=()).get()
        assert mocked_refresh.called is False
        assert mocked_refresh_cache.called is False

    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_subtask_social_auth_refresh_fails(self, mocked_refresh, mocked_refresh_cache):
        """
        Test if the refresh for the user's OAUTH token fails the task still completes
        """
        mocked_refresh.side_effect = InvalidCredentialStored
        batch_update_user_data_subtasks.s(self.students).apply(args=()).get()
        assert mocked_refresh_cache.called is False
        assert mocked_refresh.call_count == len(self.all_working_users)
        for user in self.all_working_users:
            mocked_refresh.assert_any_call(user.social_auth.get(provider=EdxOrgOAuth2.name))

    @mock.patch("edx_api.client.EdxApi.__init__", autospec=True, side_effect=AttributeError)
    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_subtask_api_client_creation_failure(self, mocked_refresh, mocked_refresh_cache, mock_api):
        """
        Test if edx_api_client object creation fails the task still completes
        """
        batch_update_user_data_subtasks.s(self.students).apply(args=()).get()
        assert mocked_refresh_cache.called is False
        for user in self.all_working_users:
            mocked_refresh.assert_any_call(user.social_auth.get(provider=EdxOrgOAuth2.name))
            mock_api.assert_any_call(mock.ANY, self.social_infos, settings.EDXORG_BASE_URL)

    @mock.patch('dashboard.api_edx_cache.CachedEdxDataApi.update_cache_if_expired', new_callable=mock.MagicMock)
    @mock.patch('backends.utils.refresh_user_token', autospec=True)
    def test_subtask_user_cache_refresh_fail(self, mocked_refresh, mocked_refresh_cache):
        """
        Test if actual cache refresh fails the task still completes
        """
        mocked_refresh_cache.side_effect = ZeroDivisionError
        batch_update_user_data_subtasks.s(self.students).apply(args=()).get()
        for user, cache_type in product(self.all_working_users, CachedEdxDataApi.SUPPORTED_CACHES):
            mocked_refresh.assert_any_call(user.social_auth.get(provider=EdxOrgOAuth2.name))
            mocked_refresh_cache.assert_any_call(user, mock.ANY, cache_type)
