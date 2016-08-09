"""
API for roles
"""
from rolepermissions.verifications import has_object_permission

from roles.models import Role


def get_advance_searchable_programs(user):
    """
    Helper function to retrieve all the programs where the user is allowed to search

    Args:
        user (User): Django user instance
    Returns:
        list: list of courses.models.Program instances
    """
    user_role_program = Role.objects.filter(user=user)
    programs = [
        role.program for role in user_role_program
        if has_object_permission('can_advance_search', user, role.program)
    ]
    return programs
