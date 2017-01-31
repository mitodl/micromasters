"""
Tests for the unseed_db command
"""
from django.contrib.auth.models import User
from micromasters.factories import UserFactory
from courses.factories import ProgramFactory
from courses.models import Program
from seed_data.management.commands.unseed_db import unseed_db
from seed_data.management.commands import (
    FAKE_USER_USERNAME_PREFIX,
    FAKE_PROGRAM_DESC_PREFIX,
)
from search.base import MockedESTestCase


class UnseedDBTests(MockedESTestCase):
    """Tests for the unseed_db_commond"""
    def test_unseed_db(self):
        """Test that unseed_db deletes seed data"""
        for i in range(2):
            ProgramFactory.create(description='{} test program {}'.format(FAKE_PROGRAM_DESC_PREFIX, i))
            UserFactory.create(username='{}.test.user.{}'.format(FAKE_USER_USERNAME_PREFIX, i))
        fake_program_qset = Program.objects.filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX)
        fake_user_qset = User.objects.filter(username__startswith=FAKE_USER_USERNAME_PREFIX)
        assert fake_program_qset.count() == 2
        assert fake_user_qset.count() == 2
        unseed_db()
        assert fake_program_qset.count() == 0
        assert fake_user_qset.count() == 0
