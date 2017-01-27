"""authorization command test"""

from unittest.mock import patch
from django.test import TestCase
from django.db.models.signals import post_save
from factory.django import mute_signals

from financialaid.api_test import create_program
from exams.management.commands import authorization_user_exam
from profiles.factories import ProfileFactory


class AuthorizationCommandTests(TestCase):
    """Authorization command tests"""
    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            profile1 = ProfileFactory.create()
            profile2 = ProfileFactory.create()

        cls.program, _ = create_program(past=True)
        cls.users = [profile1.user, profile2.user]

        cls.command = authorization_user_exam.Command()

    def test_bulk_exam_authorization(self):
        """For all users in any program"""
        with patch('exams.management.commands.authorization_user_exam.bulk_authorize_for_exam') as mocked_bafe:
            self.command.handle("authorization_user_exam", all=True)

        mocked_bafe.assert_called_once_with()

    def test_bulk_exam_authorization_given_user_name(self):
        """For given user"""
        user1 = self.users[0]
        with patch('exams.management.commands.authorization_user_exam.bulk_authorize_for_exam') as mocked_bafe:
            self.command.handle("authorization_user_exam", username=user1.username)

        mocked_bafe.assert_called_once_with(program_id=None, username=user1.username)

    def test_bulk_exam_authorization_given_program(self):
        """For given program id"""
        with patch('exams.management.commands.authorization_user_exam.bulk_authorize_for_exam') as mocked_bafe:
            self.command.handle("authorization_user_exam", program_id=self.program.id)

        mocked_bafe.assert_called_once_with(program_id=self.program.id, username=None)

    def test_bulk_exam_authorization_given_program_username(self):
        """For given program id and user name"""
        user1 = self.users[0]
        with patch('exams.management.commands.authorization_user_exam.bulk_authorize_for_exam') as mocked_bafe:
            self.command.handle("authorization_user_exam", program_id=self.program.id, username=user1.username)

        mocked_bafe.assert_called_once_with(program_id=self.program.id, username=user1.username)
