"""Permissions for discussions"""

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission

from roles.models import Role
from roles.roles import Permissions


class CanCreateChannel(BasePermission):
    """
    Only the staff for a program can create channels
    """

    def has_permission(self, request, view):
        try:
            program_id = int(request.data['program_id'])
        except (KeyError, ValueError) as ex:
            raise ValidationError("missing or invalid program id") from ex

        return Role.objects.filter(
            user=request.user,
            program_id=program_id,
            role__in=Role.permission_to_roles[Permissions.CAN_CREATE_FORUMS]
        ).exists()
