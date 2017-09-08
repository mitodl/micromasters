"""Factories for roles"""
from factory import SubFactory
from factory.django import (
    DjangoModelFactory,
)
from factory.fuzzy import FuzzyChoice

from courses.factories import ProgramFactory
from micromasters.factories import UserFactory
from roles.models import Role


class RoleFactory(DjangoModelFactory):
    """Factory for Role"""
    role = FuzzyChoice(choices=Role.ASSIGNABLE_ROLES)
    user = SubFactory(UserFactory)
    program = SubFactory(ProgramFactory)

    class Meta:
        model = Role
