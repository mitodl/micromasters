"""
Tests for roles definition
"""
from unittest import TestCase

from roles import roles


class RolesTest(TestCase):
    """
    Tests for Roles definitions
    """

    def test_staff_role_id(self):
        """
        Test for the Staff role ID
        """
        assert hasattr(roles.Staff, 'ROLE_ID')
        assert roles.Staff.ROLE_ID == 'staff'

    def test_instructor_role_id(self):
        """
        Test for the Instructor role ID
        """
        assert hasattr(roles.Instructor, 'ROLE_ID')
        assert roles.Instructor.ROLE_ID == 'instructor'
