"""
Tests for the API module
"""

from courses.factories import ProgramFactory
from micromasters.factories import UserFactory
from roles.api import get_advance_searchable_programs
from roles.models import Role
from roles.roles import Staff
from search.base import ESTestCase


class APITests(ESTestCase):
    """Tests for the roles apis"""

    @classmethod
    def setUpTestData(cls):
        super(APITests, cls).setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        # create the programs
        cls.program1 = ProgramFactory.create(live=True)
        cls.program2 = ProgramFactory.create(live=True)

    def test_get_advance_searchable_programs(self):
        """
        Test that the user can only search the programs she has permissions on
        """
        assert len(get_advance_searchable_programs(self.user)) == 0
        Role.objects.create(
            user=self.user,
            program=self.program1,
            role=Staff.ROLE_ID
        )
        search_progs = get_advance_searchable_programs(self.user)
        assert len(search_progs) == 1
        assert self.program1.id == search_progs[0].id
