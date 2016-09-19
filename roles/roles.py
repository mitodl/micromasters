"""
Definition of roles and their permissions
"""

from rolepermissions.roles import AbstractUserRole


class Permissions:
    """
    All MicroMasters custom permissions
    """
    CAN_ADVANCE_SEARCH = 'can_advance_search'
    CAN_EDIT_CMS = 'can_edit_cms'
    CAN_MESSAGE_LEARNERS = 'can_message_learners'
    CAN_CREATE_FORUMS = 'can_create_forums'
    CAN_EDIT_FINANCIAL_AID = 'can_edit_financial_aid'


class Staff(AbstractUserRole):
    """
    Role for staff users.

    The `ROLE_ID` attribute is create formal relationship
    by this definition of roles and their assignment to the users.
    """
    ROLE_ID = 'staff'

    available_permissions = {
        Permissions.CAN_ADVANCE_SEARCH: True,
        Permissions.CAN_EDIT_CMS: True,
        Permissions.CAN_MESSAGE_LEARNERS: True,
        Permissions.CAN_CREATE_FORUMS: True,
        Permissions.CAN_EDIT_FINANCIAL_AID: True,
    }


class Instructor(AbstractUserRole):
    """
    Role for instructor users

    The `ROLE_ID` attribute is create formal relationship
    by this definition of roles and their assignment to the users.
    """
    ROLE_ID = 'instructor'

    available_permissions = {
        Permissions.CAN_ADVANCE_SEARCH: True,
        Permissions.CAN_EDIT_CMS: True,
        Permissions.CAN_MESSAGE_LEARNERS: True,
        Permissions.CAN_CREATE_FORUMS: True,
        Permissions.CAN_EDIT_FINANCIAL_AID: False,
    }
