"""
Permission classes for financial aid views
"""

from rolepermissions.verifications import has_object_permission
from rest_framework.permissions import BasePermission

from roles.roles import Permissions


class UserCanEditFinancialAid(BasePermission):
    """
    Allow the user if she has the permission to approve, reject, or edit someone's
    financial aid application.
    """
    def has_object_permission(self, request, view, obj):
        """
        Returns True if the user has the can_edit_financial_aid permission for a program.
        """
        return has_object_permission(
            Permissions.CAN_EDIT_FINANCIAL_AID,
            request.user,
            obj
        )
