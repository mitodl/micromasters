"""Permissions for discussions"""

from rest_framework.permissions import BasePermission
from rolepermissions.verifications import has_permission

from roles.roles import Permissions


class CanCreateChannel(BasePermission):
    """
    Only the staff for a program can create channels
    """

    def has_permission(self, request, view):
        return has_permission(request.user, Permissions.CAN_CREATE_FORUMS)
