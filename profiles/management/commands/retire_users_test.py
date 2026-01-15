"""retire user test"""
import pytest
from django.contrib.auth import get_user_model
from django.core.management import CommandError
from django.test import TestCase
from social_django.models import UserSocialAuth

from dashboard.factories import ProgramEnrollmentFactory
from dashboard.models import ProgramEnrollment
from micromasters.factories import UserFactory, UserSocialAuthFactory
from profiles.management.commands import retire_users

User = get_user_model()

TOTAL_PROGRAMS = 3


class AlterDataCommandTests(TestCase):
    """Test cases for retire_users commands"""

    def setUp(self):
        super().setUp()
        self.command = retire_users.Command()

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

    def test_single_success_user_with_email(self):
        """test retire_users command with email success"""
        user = UserFactory.create(email='foo@example.com', is_active=True)
        user.profile.email_optin = True
        user.profile.save()
        UserSocialAuthFactory.create(user=user, provider='not_edx')

        for _ in range(TOTAL_PROGRAMS):
            ProgramEnrollmentFactory.create(user=user)

        assert user.is_active is True
        assert user.profile.email_optin is True
        assert UserSocialAuth.objects.filter(user=user).count() == 1

        assert ProgramEnrollment.objects.filter(user=user).count() == TOTAL_PROGRAMS

        self.command.handle("retire_users", users=["foo@example.com"])

        user.refresh_from_db()
        assert user.is_active is False
        assert user.profile.email_optin is False
        assert UserSocialAuth.objects.filter(user=user).count() == 0
        assert ProgramEnrollment.objects.filter(user=user).count() == 0

    def test_error_with_invalid_users(self):
        """test retire_users command with invalid users """
        users = ["", "mitodl"]
        self.command.handle("retire_users", users=users)
        for user in users:
            with pytest.raises(User.DoesNotExist):
                User.objects.get(username=user)

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

    def test_multiple_success_with_user_email(self):
        """test retire_users command success with more than one user emails"""
        users = ["foo@example.com", "bar@example.com", "baz@example.com"]

        for current_user in users:
            user = UserFactory.create(email=current_user, is_active=True)
            user.profile.email_optin = True
            user.profile.save()
            UserSocialAuthFactory.create(user=user, provider='not_edx')
            for _ in range(TOTAL_PROGRAMS):
                ProgramEnrollmentFactory.create(user=user)

            assert user.is_active is True
            assert user.profile.email_optin is True
            assert UserSocialAuth.objects.filter(user=user).count() == 1
            assert ProgramEnrollment.objects.filter(user=user).count() == TOTAL_PROGRAMS

        self.command.handle("retire_users", users=users)

        for current_user in users:
            user = User.objects.get(email=current_user)
            assert user.is_active is False
            assert user.profile.email_optin is False
            assert UserSocialAuth.objects.filter(user=user).count() == 0
            assert ProgramEnrollment.objects.filter(user=user).count() == 0
