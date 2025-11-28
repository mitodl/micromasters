"""
Tests for the unseed_db command
"""
from django.contrib.auth import get_user_model

from courses.factories import ProgramFactory
from courses.models import Program
from micromasters.factories import UserFactory
from search.base import MockedESTestCase
from seed_data.management.commands import (FAKE_PROGRAM_DESC_PREFIX,
                                           FAKE_USER_USERNAME_PREFIX)
from seed_data.management.commands.unseed_db import unseed_db

User = get_user_model()


class UnseedDBTests(MockedESTestCase):
    """Tests for the unseed_db_commond"""
    def test_unseed_db(self):
        """Test that unseed_db deletes seed data"""
        for i in range(2):
            ProgramFactory.create(description=f'{FAKE_PROGRAM_DESC_PREFIX} test program {i}')
            UserFactory.create(username=f'{FAKE_USER_USERNAME_PREFIX}.test.user.{i}')
        fake_program_qset = Program.objects.filter(description__startswith=FAKE_PROGRAM_DESC_PREFIX)
        fake_user_qset = User.objects.filter(username__startswith=FAKE_USER_USERNAME_PREFIX)
        assert fake_program_qset.count() == 2
        assert fake_user_qset.count() == 2
        unseed_db()
        assert fake_program_qset.count() == 0
        assert fake_user_qset.count() == 0
