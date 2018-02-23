"""
Permission classes for financial aid views
"""
from rolepermissions.checkers import has_object_permission
from rest_framework.permissions import BasePermission

from roles.roles import Permissions


class UserCanEditFinancialAid(BasePermission):
    """
    Allow the user if she has the permission to approve or edit someone's
    financial aid application.
    """
    def has_object_permission(self, request, view, obj):
        """
        Returns True if the user has the can_edit_financial_aid permission for a program.
        Args:
            request (Request): DRF request object
            view (View): DRF view object
            obj (FinancialAid): FinancialAid object
        Returns:
            boolean
        """
        return has_object_permission(Permissions.CAN_EDIT_FINANCIAL_AID, request.user, obj.tier_program.program)


class FinancialAidUserMatchesLoggedInUser(BasePermission):
    """
    Returns True if accessing own FinancialAid object
    """
    def has_object_permission(self, request, view, obj):
        """
        Returns True if the FinancialAid.user matches the logged in user
        Args:
            request (Request): DRF request object
            view (View): DRF view object
            obj (FinancialAid): FinancialAid object
        Returns:
            boolean
        """
        return obj.user == request.user
