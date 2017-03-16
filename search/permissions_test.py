"""
Tests for permissions classes
"""
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory

from courses.factories import ProgramFactory
from micromasters.factories import UserFactory
from roles.models import Role
from roles.roles import Staff
from search import permissions
from search.base import ESTestCase


class PermissionsTests(ESTestCase):
    """Tests for the search view permissions"""

    @classmethod
    def setUpTestData(cls):
        super(PermissionsTests, cls).setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        # create the program
        cls.program = ProgramFactory.create(live=True)

    def setUp(self):
        super(PermissionsTests, self).setUp()
        self.request = RequestFactory().get('/')
        self.request.user = AnonymousUser()

    def test_user_can_search(self):
        """
        Checks that an user can search only if she has the right permissions
        """
        perm = permissions.UserCanAdvanceSearchPermission()
        # the anonymous user does not have permission to search
        assert perm.has_permission(self.request, None) is False
        # neither the user by default
        self.request.user = self.user
        assert perm.has_permission(self.request, None) is False
        # but if the user has a proper role, she has permission
        Role.objects.create(
            user=self.user,
            program=self.program,
            role=Staff.ROLE_ID
        )
        assert perm.has_permission(self.request, None) is True
