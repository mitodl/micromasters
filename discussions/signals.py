"""
Signals for user profiles
"""
from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from discussions import tasks
from profiles.models import Profile


@receiver(post_save, sender=Profile, dispatch_uid="sync_user_profile")
def sync_user_profile(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler create/update a DiscussionUser every time a profile is created/updated
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        return
    transaction.on_commit(lambda: tasks.sync_discussion_user.delay(instance.user_id))
