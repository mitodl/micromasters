"""
Periodic task that updates user data.
"""
import logging
import uuid
from datetime import timedelta

from celery import group
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import caches
from django.db.models import Q
from edx_api.client import EdxApi
from social_django.models import UserSocialAuth

from backends import utils
from backends.edxorg import EdxOrgOAuth2
from dashboard.models import UserCacheRefreshTime
from dashboard.api_edx_cache import CachedEdxDataApi
from micromasters.celery import app
from micromasters.utils import (
    chunks,
    now_in_utc,
)


log = logging.getLogger(__name__)
cache_redis = caches['redis']


MAX_HRS_MAIN_TASK = 6
PARALLEL_RATE_LIMIT = '10/m'
LOCK_EXPIRE = 60 * 60 * 2  # Lock expires in 2 hrs
lock_id = '{0}-lock'.format(uuid.uuid4())


@app.task
def batch_update_user_data():
    """
    Create sub tasks to update user data like enrollments,
    certificates and grades from edX platform.
    """
    def acquire_lock():
        """
        create lock by adding a key to storage.
        """
        # lock will expire if 2 hrs are pass and task is not complete.
        return cache_redis.add(lock_id, 'true', LOCK_EXPIRE)

    def release_lock():
        """
        remove lock by deleteing key from storage.
        """
        return cache_redis.delete(lock_id)

    if acquire_lock():
        refresh_time_limit = now_in_utc() - timedelta(hours=MAX_HRS_MAIN_TASK)

        users_expired_cache = UserCacheRefreshTime.objects.filter(
            Q(enrollment__lt=refresh_time_limit) |
            Q(certificate__lt=refresh_time_limit) |
            Q(current_grade__lt=refresh_time_limit),
            user__is_active=True,
            user__profile__fake_user=False
        ).values_list('user', flat=True).distinct()

        users_not_in_cache = User.objects.exclude(
            Q(id__in=users_expired_cache)
        ).filter(is_active=True, profile__fake_user=False).values_list('id', flat=True)

        users_to_refresh = list(set(users_expired_cache) | set(users_not_in_cache))

        job = group(
            batch_update_user_data_subtasks.s(list_users) for list_users in chunks(users_to_refresh)
        )
        result = job.apply_async()
        result.ready()

        if result.successful():
            # release lock if all tasks are done.
            release_lock()


@app.task(rate_limit=PARALLEL_RATE_LIMIT)
def batch_update_user_data_subtasks(students):
    """
    Update user data like enrollments, certificates and grades from edX platform.

    Args:
        students (List): List of students.
    """
    # pylint: disable=bare-except
    for user_id in students:
        try:
            user = User.objects.get(pk=user_id)
        except:
            log.exception('edX data refresh task: unable to get user "%s"', user_id)
            continue

        try:
            UserSocialAuth.objects.get(user=user)
        except:
            log.exception('user "%s" does not have python social auth object', user.username)
            continue

        # get the credentials for the current user for edX
        try:
            user_social = user.social_auth.get(provider=EdxOrgOAuth2.name)
        except:
            log.exception('user "%s" does not have edX credentials', user.username)
            continue

        try:
            utils.refresh_user_token(user_social)
        except:
            log.exception("Unable to refresh token for student %s", user.username)
            continue

        try:
            edx_client = EdxApi(user_social.extra_data, settings.EDXORG_BASE_URL)
        except:
            log.exception("Unable to create an edX client object for student %s", user.username)
            continue

        for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
            try:
                CachedEdxDataApi.update_cache_if_expired(user, edx_client, cache_type)
            except:
                log.exception("Unable to refresh cache %s for student %s", cache_type, user.username)
                continue
