"""
Periodic task that updates user data.
"""
import logging

from celery import group
from django.core.cache import caches

from dashboard.api import (
    calculate_users_to_refresh_in_bulk,
    refresh_user_data,
)
from micromasters.celery import app
from micromasters.utils import chunks


log = logging.getLogger(__name__)
cache_redis = caches['redis']


PARALLEL_RATE_LIMIT = '10/m'
LOCK_EXPIRE = 60 * 60 * 2  # Lock expires in 2 hrs
LOCK_ID = 'batch_update_user_data_lock'


def _acquire_lock():
    """
    create lock by adding a key to storage.
    """
    # lock will expire if 2 hrs are pass and task is not complete.
    return cache_redis.add(LOCK_ID, 'true', LOCK_EXPIRE)


def _release_lock():
    """
    remove lock by deleting key from storage.
    """
    return cache_redis.delete(LOCK_ID)


@app.task
def release_batch_update_user_data_lock(*args):  # pylint: disable=unused-argument
    """
    Task which releases the lock acquired in batch_update_user_data
    """
    _release_lock()
    log.info("Released batch_update_user_data lock")


# This lock is not safe against repeated executions of the task since there is no logic
# to stop the batch update halfway through and the lock expiration might be shorter than the length of time this
# executes.
@app.task
def batch_update_user_data():
    """
    Create sub tasks to update user data like enrollments,
    certificates and grades from edX platform.
    """
    if not _acquire_lock():
        # Should not usually happen. This task executes every 6 hours and the lock expires after 2.
        log.error("Unable to acquire lock to batch_update_user_data.")
        return

    users_to_refresh = calculate_users_to_refresh_in_bulk()

    if len(users_to_refresh) > 0:
        job = group(
            batch_update_user_data_subtasks.s(list_users)
            for list_users in chunks(users_to_refresh)
        )
        # release_batch_update_user_data_lock will not get executed if any of the subtasks error,
        # but we handle all exceptions in the subtask so that shouldn't happen
        jobs = job | release_batch_update_user_data_lock.s()
    else:
        # celery requires at least one item in a group(...)
        jobs = release_batch_update_user_data_lock
    jobs.delay()


@app.task(rate_limit=PARALLEL_RATE_LIMIT)
def batch_update_user_data_subtasks(students):
    """
    Update user data like enrollments, certificates and grades from edX platform.

    Args:
        students (list of int): List of user ids for students.
    """
    for user_id in students:
        refresh_user_data(user_id)
