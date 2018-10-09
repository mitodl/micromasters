"""retire user test"""
from django.contrib.auth.models import User
from django.core.management import CommandError
from django.test import TestCase
from social_django.models import UserSocialAuth

from profiles.management.commands import retire_users
from micromasters.factories import UserFactory, UserSocialAuthFactory
from dashboard.factories import ProgramEnrollmentFactory
from dashboard.models import ProgramEnrollment

TOTAL_PROGRAMS = 3


class AlterDataCommandTests(TestCase):
    """Test cases for retire_users commands"""

    @classmethod
    def setUpTestData(cls):
        cls.command = retire_users.Command()

    def test_no_users_select(self):
        """selected no user"""
        with self.assertRaises(CommandError):
            self.command.handle("retire_users", users=[])

    def test_single_success(self):
        """test retire_users command success"""
        user = UserFactory.create(username='foo', is_active=True)
        user.profile.email_optin = True
        user.profile.save()
        UserSocialAuthFactory.create(user=user, provider='not_edx')

        for _ in range(TOTAL_PROGRAMS):
            ProgramEnrollmentFactory.create(user=user)

        assert user.is_active is True
        assert user.profile.email_optin is True
        assert UserSocialAuth.objects.filter(user=user).count() == 1

        assert ProgramEnrollment.objects.filter(user=user).count() == TOTAL_PROGRAMS

        self.command.handle("retire_users", users=["foo"])

        user.refresh_from_db()
        assert user.is_active is False
        assert user.profile.email_optin is False
        assert UserSocialAuth.objects.filter(user=user).count() == 0
        assert ProgramEnrollment.objects.filter(user=user).count() == 0

    def test_multiple_success(self):
        """test retire_users command success with more than one user"""
        user_names = ["foo", "bar", "baz"]

        for user_name in user_names:
            user = UserFactory.create(username=user_name, is_active=True)
            user.profile.email_optin = True
            user.profile.save()
            UserSocialAuthFactory.create(user=user, provider='not_edx')
            for _ in range(TOTAL_PROGRAMS):
                ProgramEnrollmentFactory.create(user=user)

            assert user.is_active is True
            assert user.profile.email_optin is True
            assert UserSocialAuth.objects.filter(user=user).count() == 1
            assert ProgramEnrollment.objects.filter(user=user).count() == TOTAL_PROGRAMS

        self.command.handle("retire_users", users=user_names)

        for user_name in user_names:
            user = User.objects.get(username=user_name)
            assert user.is_active is False
            assert user.profile.email_optin is False
            assert UserSocialAuth.objects.filter(user=user).count() == 0
            assert ProgramEnrollment.objects.filter(user=user).count() == 0
