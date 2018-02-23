"""
Tests for signals
"""
from django.db.models.signals import post_save
from factory.django import mute_signals
from rolepermissions.checkers import (
    has_role,
    has_permission,
    has_object_permission,
)

from courses.factories import ProgramFactory
from roles.models import Role
from micromasters.factories import UserFactory
from search.base import MockedESTestCase


class SignalsTest(MockedESTestCase):
    """
    Tests for signals triggered by the role assignment
    """

    def setUp(self):
        super(SignalsTest, self).setUp()
        self.user = UserFactory.create()
        self.program = ProgramFactory.create()

    def assert_standard_role_permissions(self, expected_bool, program=None):
        """
        Helper function to assert role and permissions assignment
        """
        assert isinstance(expected_bool, bool)
        assert has_role(self.user, 'staff') is expected_bool
        assert has_permission(self.user, 'can_advance_search') is expected_bool
        assert has_object_permission('can_advance_search', self.user, program or self.program) is expected_bool

    def test_assign_role(self):
        """
        Assigning the role with the model triggers a signal
        to assign the correspondent role to the user.
        """
        self.assert_standard_role_permissions(False)
        Role.objects.create(
            program=self.program,
            user=self.user,
            role='staff',
        )
        self.assert_standard_role_permissions(True)

    def test_presave_removes_current_role(self):
        """
        Updating the role in the model triggers a pre_save
        signal that removes the previous role from the user.
        """
        mm_role = Role.objects.create(
            program=self.program,
            user=self.user,
            role='staff',
        )
        self.assert_standard_role_permissions(True)

        # muting the post_save signal to avoid the reassignment of the roles and related permissions
        # in this way only the pre_save will run and the effect will be only to remove the old role
        with mute_signals(post_save):
            mm_role.role = 'instructor'
            mm_role.save()
        self.assert_standard_role_permissions(False)

    def test_postdelete_removes_role(self):
        """
        If role assignment is removed, a signal takes
        care of removing the role from the user.
        """
        mm_role = Role.objects.create(
            program=self.program,
            user=self.user,
            role='staff',
        )
        self.assert_standard_role_permissions(True)

        mm_role.delete()
        self.assert_standard_role_permissions(False)

    def test_postdelete_multiple_programs_role(self):
        """
        If role assignment is removed for one program but the
        same role is assigned to another program, the user keeps the role.
        """
        existing_program = self.program
        new_program = ProgramFactory.create()
        mm_role_1 = Role.objects.create(
            program=existing_program,
            user=self.user,
            role='staff',
        )
        Role.objects.create(
            program=new_program,
            user=self.user,
            role='staff',
        )
        self.assert_standard_role_permissions(True, existing_program)
        self.assert_standard_role_permissions(True, new_program)

        mm_role_1.delete()
        self.assert_standard_role_permissions(True, new_program)
