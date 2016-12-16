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
    user_role_program = Role.objects.filter(user=user).select_related('program')
    programs = [
        role.program for role in user_role_program
        if has_object_permission('can_advance_search', user, role.program)
    ]
    return programs


def is_learner(user, program):
    """
    Returns true if user is a learner

    Args:
        user (django.contrib.auth.models.User): A user
        program (courses.models.Program): Program object
    """
    return (
        not Role.objects.filter(user=user, role__in=Role.NON_LEARNERS, program=program).exists()
    )
