"""
Signals for the micromasters app
"""

import logging

from django.db.models.signals import (
    pre_save,
    post_save,
    post_delete,
)
from django.dispatch import receiver
from rolepermissions.roles import assign_role, remove_role

from roles.models import Role


log = logging.getLogger(__name__)


@receiver(pre_save, sender=Role, dispatch_uid="save_remove_role_from_user")
def save_remove_role_from_user(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler that happens before a role assignment is done.
    If the the save happens for a modification, the previous role must be removed
    if not correspondent to other programs.

    Theoretically this is not necessary with the current implementation of the
    django-role-permission library.
    """
    try:
        old_instance = Role.objects.get(pk=instance.pk)
    except Role.DoesNotExist:
        return
    # the reason why this check is "> 1" is because this happens BEFORE the save
    # so 1 entry is for the current value
    if Role.objects.filter(role=old_instance.role).count() > 1:
        return

    log.debug(
        'removing role % for user %s',
        instance.role,
        instance.user.username,
    )
    remove_role(instance.user, old_instance.role)


@receiver(post_save, sender=Role, dispatch_uid="save_assign_role_to_user")
def save_assign_role_to_user(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to assign a logical role to an user every time
    the same role is assigned to an user for a program
    """
    log.debug(
        'assigning role %s to user %s',
        instance.role,
        instance.user.username,
    )
    assign_role(instance.user, instance.role)


@receiver(post_delete, sender=Role, dispatch_uid="delete_remove_role_from_user")
def delete_remove_role_from_user(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler that happens after a role removal is done.
    The role must be removed only if not correspondent to other programs.
    """
    # the reason why this check is "> 0" is because this happens AFTER the delete
    # there are no entries for the current value
    if Role.objects.filter(role=instance.role).count() > 0:
        return

    log.debug(
        'removing role % for user %s',
        instance.role,
        instance.user.username,
    )
    remove_role(instance.user, instance.role)
