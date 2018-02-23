"""
Specific permissions for the micromasters app
"""

from rolepermissions.permissions import register_object_checker
from rolepermissions.checkers import has_permission

from roles.models import Role
from roles.roles import Permissions


@register_object_checker()
def can_advance_search(role, user, program):
    """
    Determines whether a user can perform an advanced search on a specific program.
    """
    return (
        has_permission(user, Permissions.CAN_ADVANCE_SEARCH) and Role.objects.filter(
            user=user, role=role.ROLE_ID, program=program).exists()
    )


@register_object_checker()
def can_edit_financial_aid(role, user, program):
    """
    Determines whether a user can access and edit financial aid requests for a specific program.
    """
    return (
        has_permission(user, Permissions.CAN_EDIT_FINANCIAL_AID) and Role.objects.filter(
            user=user, role=role.ROLE_ID, program=program).exists()
    )
