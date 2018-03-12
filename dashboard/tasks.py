"""
Periodic task that updates user data.
"""
from datetime import (
    datetime,
    timedelta,
)
import logging

from celery import group
from django.conf import settings
import pytz

from dashboard.api import (
    calculate_users_to_refresh_in_bulk,
    refresh_user_data,
)
from micromasters.celery import app
from micromasters.locks import (
    Lock,
    release_lock,
)
from micromasters.utils import (
    chunks,
    now_in_utc,
)


log = logging.getLogger(__name__)


LOCK_ID = 'batch_update_user_data_lock'


@app.task
def release_batch_update_user_data_lock(*args, token):  # pylint: disable=unused-argument
    """
    Task which releases the lock acquired in batch_update_user_data

    Args:
        token (str): The token used with the lock
    """
    release_lock(LOCK_ID, token.encode())
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
    expiration = now_in_utc() + timedelta(hours=5)
    lock = Lock(LOCK_ID, expiration)
    if not lock.acquire():
        # Lock should have expired by now
        log.error("Unable to acquire lock for batch_update_user_data")
        return

    users_to_refresh = calculate_users_to_refresh_in_bulk()

    jobs = release_batch_update_user_data_lock.s(token=lock.token.decode())
    try:
        if len(users_to_refresh) > 0:
            user_id_chunks = chunks(users_to_refresh)

            job = group(
                batch_update_user_data_subtasks.s(user_id_chunk, expiration.timestamp())
                for user_id_chunk in user_id_chunks
            )
            jobs = job | jobs
    finally:
        jobs.delay()


@app.task(rate_limit=settings.BATCH_UPDATE_RATE_LIMIT)
def batch_update_user_data_subtasks(students, expiration_timestamp):
    """
    Update user data like enrollments, certificates and grades from edX platform.

    Args:
        students (list of int): List of user ids for students.
        expiration_timestamp (float): A timestamp indicating when the tasks should stop processing
    """
    expiration = datetime.fromtimestamp(expiration_timestamp, tz=pytz.utc)
    for user_id in students:
        # if we are past the expiration time we should stop any extra work
        if expiration > now_in_utc():
            refresh_user_data(user_id)
