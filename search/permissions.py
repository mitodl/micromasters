"""
Permission classes for search views
"""

from rolepermissions.checkers import has_permission
from rest_framework.permissions import BasePermission

from roles.roles import Permissions


class UserCanAdvanceSearchPermission(BasePermission):
    """
    Allow the user if she has the permission to search any program.
    """

    def has_permission(self, request, view):
        """
        Returns True if the user has the 'can_advance_search' permission.
        """
        return has_permission(request.user, Permissions.CAN_ADVANCE_SEARCH)
