"""Tasks for profiles"""
from datetime import timedelta
from itertools import takewhile

from celery.utils.log import get_task_logger
from django.conf import settings

from discussions import api
from discussions.exceptions import DiscussionUserSyncException
from micromasters.celery import app
from micromasters.locks import Lock
from micromasters.utils import now_in_utc
from profiles.models import Profile

SYNC_MEMBERSHIPS_LOCK_NAME = 'discussions.tasks.sync_memberships_lock'

# let it run for up to 2 minutes minus a 5 second buffer
# we do the buffer so the lock is cleared before the next cron run
# this is a trade off of letting it run longer vs. having a stale view
SYNC_MEMBERSHIPS_LOCK_TTL_SECONDS = 60 * 2 - 5

log = get_task_logger(__name__)


@app.task()
def sync_discussion_user(user_id):
    """
    Sync the user's profile to open discussions

    Args:
        user_id (int): user id
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        return

    try:
        api.create_or_update_discussion_user(user_id)
    except DiscussionUserSyncException:
        log.exception("Error syncing user profile")


@app.task()
def sync_discussion_users():
    """
    Sync the user's profile to open discussions
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        log.debug('OPEN_DISCUSSIONS_USER_SYNC is set to False (so disabled) in the settings')
        return
    users_to_backfill = Profile.objects.exclude(
        user__discussion_user__isnull=False).values_list('user__id', flat=True)

    for user_id in users_to_backfill:
        try:
            api.create_or_update_discussion_user(user_id)
        except DiscussionUserSyncException:
            log.error('Impossible to sync user_id %s to discussions', user_id)


@app.task()
def add_moderators_to_channel(channel_name):
    """
    Add moderators to a open-discussions channel
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        log.debug('OPEN_DISCUSSIONS_USER_SYNC is set to False (so disabled) in the settings')
        return

    api.add_moderators_to_channel(channel_name)


@app.task()
def sync_channel_memberships():
    """
    Syncs outstanding channel memberships
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        log.debug('OPEN_DISCUSSIONS_USER_SYNC is set to False (so disabled) in the settings')
        return

    expiration = now_in_utc() + timedelta(seconds=SYNC_MEMBERSHIPS_LOCK_TTL_SECONDS)
    with Lock(SYNC_MEMBERSHIPS_LOCK_NAME, expiration) as lock:
        membership_ids = takewhile(lock.is_still_locked, api.get_membership_ids_needing_sync())
        api.sync_channel_memberships(membership_ids)
