"""
Tests for backends views
"""
from unittest.mock import patch
from django.http import HttpResponse
from rest_framework.test import APITestCase
from django.core.urlresolvers import reverse
from django_redis import get_redis_connection

from dashboard.factories import UserCacheRefreshTimeFactory
from dashboard.api import CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE
from micromasters.factories import SocialUserFactory
from search.base import MockedESTestCase


class BackendViewTest(MockedESTestCase, APITestCase):
    """
    Tests for dashboard Rest API
    """

    @classmethod
    def setUpTestData(cls):
        super(BackendViewTest, cls).setUpTestData()
        # create a user
        cls.user = SocialUserFactory.create()
        UserCacheRefreshTimeFactory(user=cls.user, unexpired=True)
        cls.url = reverse('social:complete', args=['edxorg'])

    @patch('backends.views.social_complete', autospec=True)
    def test_redis_cache_updated(self, mocked_complete):
        """
        Test
        """

        def log_user_again(request, *args, **kwargs):
            self.client.force_login(request.user)
            return HttpResponse()

        mocked_complete.side_effect = log_user_again

        con = get_redis_connection("redis")
        con.sadd(CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE, self.user.id)
        assert con.sismember(CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE, self.user.id) is True

        self.client.get(self.url)
        assert mocked_complete.call_count == 1
        assert con.sismember(CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE, self.user.id) is False
