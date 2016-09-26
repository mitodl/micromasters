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
        Args:
            request (Request): DRF request object
            view (View): DRF view object
            obj (FinancialAid): FinancialAid object
        Returns:
            boolean
        """
        return has_object_permission(Permissions.CAN_EDIT_FINANCIAL_AID, request.user, obj.tier_program.program)


class UserCanViewLearnerCoursePrice(BasePermission):
    """
    Only those with Permissions.CAN_EDIT_FINANCIAL_AID or who are accessing their own course price
    are permitted.
    """
    def has_object_permission(self, request, view, obj_dict):
        """
        Returns True if the user can view learner's course price
        Args:
            request (Request): DRF request object
            view (View): DRF view object
            obj_dict (dict): {"program": Program object, "learner": User object}
        Returns:
            boolean
        """
        return (obj_dict["learner"] == request.user
                or has_object_permission(Permissions.CAN_EDIT_FINANCIAL_AID, request.user, obj_dict["program"]))
