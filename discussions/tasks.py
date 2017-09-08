"""Tasks for profiles"""
from celery.utils.log import get_task_logger
from django.conf import settings

from discussions import api
from discussions.exceptions import DiscussionUserSyncException
from micromasters.celery import app
from profiles.models import Profile


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
        log.error('OPEN_DISCUSSIONS_USER_SYNC is set to False (so disabled) in the settings')
        return
    users_to_backfill = Profile.objects.exclude(
        user__discussion_user__isnull=False).values_list('user__id', flat=True)

    for user_id in users_to_backfill:
        try:
            api.create_or_update_discussion_user(user_id)
        except DiscussionUserSyncException:
            log.error('Impossible to sync user_id %s to discussions', user_id)
