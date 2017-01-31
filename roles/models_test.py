"""
Tests for models
"""
from django.core.exceptions import ValidationError

from courses.factories import ProgramFactory
from micromasters.factories import UserFactory
from roles import roles
from roles.models import Role
from search.base import MockedESTestCase


class MicroMastersRoleTest(MockedESTestCase):
    """
    Tests for the MicroMastersRole model
    """

    @classmethod
    def setUpTestData(cls):
        super(MicroMastersRoleTest, cls).setUpTestData()
        cls.user = UserFactory.create()
        cls.program1 = ProgramFactory.create()
        cls.program2 = ProgramFactory.create()

    def tearDown(self):
        super(MicroMastersRoleTest, self).tearDown()
        Role.objects.all().delete()

    def test_role_available(self):
        """
        Simple test for all the roles available
        """
        for role_key in Role.ASSIGNABLE_ROLES:
            assert role_key in (roles.Staff.ROLE_ID, roles.Instructor.ROLE_ID, )

    def test_one_role_in_program(self):
        """
        The same user cannot have different roles in the same program
        """
        Role.objects.create(
            user=self.user,
            program=self.program1,
            role=roles.Staff.ROLE_ID
        )
        with self.assertRaises(ValidationError):
            Role.objects.create(
                user=self.user,
                program=self.program1,
                role=roles.Instructor.ROLE_ID
            )

    def test_one_role_in_multiple_program(self):
        """
        The same user cannot have different roles even in different programs
        """
        Role.objects.create(
            user=self.user,
            program=self.program1,
            role=roles.Staff.ROLE_ID
        )
        with self.assertRaises(ValidationError):
            Role.objects.create(
                user=self.user,
                program=self.program2,
                role=roles.Instructor.ROLE_ID
            )

    def test_role_modification(self):
        """
        The role for a user can be modified if there is not another same role for another program
        """
        role = Role.objects.create(
            user=self.user,
            program=self.program1,
            role=roles.Staff.ROLE_ID
        )
        # role can be modified
        role.role = roles.Instructor.ROLE_ID
        role.save()
        # crete a second role for the user in another program
        Role.objects.create(
            user=self.user,
            program=self.program2,
            role=roles.Instructor.ROLE_ID
        )
        # the role cannot be modified any more
        with self.assertRaises(ValidationError):
            role.role = roles.Staff.ROLE_ID
            role.save()
