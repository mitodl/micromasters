"""
Signals for user profiles
"""
from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from discussions import tasks
from profiles.models import Profile
from roles.models import Role
from roles.roles import Permissions


@receiver(post_save, sender=Profile, dispatch_uid="sync_user_profile")
def sync_user_profile(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler create/update a DiscussionUser every time a profile is created/updated
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        return
    transaction.on_commit(lambda: tasks.sync_discussion_user.delay(instance.user_id))


@receiver(post_save, sender=Role, dispatch_uid="add_staff_as_moderator")
def add_staff_as_moderator(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler add user as moderator when his staff role on program is added
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        return

    if instance.role not in Role.permission_to_roles[Permissions.CAN_CREATE_FORUMS]:
        return

    transaction.on_commit(
        lambda: tasks.add_user_as_moderator_to_channel.delay(
            instance.user_id,
            instance.program_id,
        )
    )


@receiver(post_delete, sender=Role, dispatch_uid="delete_staff_as_moderator")
def delete_staff_as_moderator(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler removes user as moderator when his staff role on program is deleted
    """
    if not settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False):
        return

    if instance.role not in Role.permission_to_roles[Permissions.CAN_CREATE_FORUMS]:
        return

    transaction.on_commit(
        lambda: tasks.remove_user_as_moderator_from_channel.delay(
            instance.user_id,
            instance.program_id,
        )
    )
