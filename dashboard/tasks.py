"""
Periodic task that updates user data.
"""
import logging
import uuid
from datetime import datetime, timedelta

import pytz
from celery import group
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db.models import Q
from edx_api.client import EdxApi
from social.apps.django_app.default.models import UserSocialAuth

from backends import utils
from backends.edxorg import EdxOrgOAuth2
from dashboard.models import UserCacheRefreshTime
from dashboard.api_edx_cache import CachedEdxDataApi
from micromasters.celery import async


log = logging.getLogger(__name__)


MAX_STUDENT_CHUNK_SIZE = 20  # max 20 students per sub task
MAX_HRS_MAIN_TASK = 6
PARALLEL_RATE_LIMIT = '10/m'
LOCK_EXPIRE = 60 * 60 * 2  # Lock expires in 2 hrs
lock_id = '{0}-lock'.format(uuid.uuid4())


def chunks(students, chunk_size=MAX_STUDENT_CHUNK_SIZE):
    """
    Divid list into sub lists each of max size chunk_size.
    Args:
        students (List): list of studnets
        chunk_size (Number): Max size of each sublist

    Returns:
    List: List of sublist containing student ids.
    """
    chunk_size = max(1, chunk_size)
    for i in range(0, len(students), chunk_size):
        yield students[i:i + chunk_size]


@async.task
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
        return cache.add(lock_id, 'true', LOCK_EXPIRE)

    def release_lock():
        """
        remove lock by deleteing key from storage.
        """
        return cache.delete(lock_id)

    if acquire_lock():
        refresh_time_limit = datetime.now(tz=pytz.UTC) - timedelta(hours=MAX_HRS_MAIN_TASK)

        users_expired_cache = UserCacheRefreshTime.objects.filter(
            Q(enrollment__lt=refresh_time_limit) |
            Q(certificate__lt=refresh_time_limit) |
            Q(current_grade__lt=refresh_time_limit)
        ).values_list('user', flat=True).distinct()

        users_not_in_cache = User.objects.exclude(
            Q(id__in=users_expired_cache)
        ).values_list('id', flat=True)

        users_to_refresh = list(set(users_expired_cache) | set(users_not_in_cache))

        job = group(
            batch_update_user_data_subtasks.s(list_users) for list_users in chunks(users_to_refresh)
        )
        result = job.apply_async()
        result.ready()

        if result.successful():
            # release lock if all tasks are done.
            release_lock()


@async.task(rate_limit=PARALLEL_RATE_LIMIT)
def batch_update_user_data_subtasks(students):
    """
    Update user data like enrollments, certificates and grades from edX platform.

    Args:
        students (List): List of students.
    """
    for user_id in students:
        try:
            # pylint: disable=broad-except
            user = User.objects.get(pk=user_id)

            if UserSocialAuth.objects.filter(user=user).exists():
                # get the credentials for the current user for edX
                user_social = user.social_auth.get(provider=EdxOrgOAuth2.name)

                try:
                    utils.refresh_user_token(user_social)
                except utils.InvalidCredentialStored as exc:
                    log.error(
                        "Unable to refresh token for student %s, status code is %d and error is %s",
                        user.username, exc.http_status_code, str(exc)
                    )
                    continue

                edx_client = EdxApi(user_social.extra_data, settings.EDXORG_BASE_URL)

                for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
                    CachedEdxDataApi.update_cache_if_expired(user, edx_client, cache_type)

        except Exception as e:
            log.exception(
                "Unable to refresh token for student_id %d, error is %s",
                user_id, str(e)
            )
