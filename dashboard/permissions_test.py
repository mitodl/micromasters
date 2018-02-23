"""
Tests for the dashboard permissions
"""
from unittest.mock import Mock
from django.http import Http404
from django.db.models.signals import post_save
from factory.django import mute_signals
import ddt

from backends.edxorg import EdxOrgOAuth2
from courses.factories import ProgramFactory
from micromasters.factories import UserFactory
from dashboard.models import ProgramEnrollment
from dashboard.permissions import CanReadIfStaffOrSelf
from search.base import MockedESTestCase
from roles.models import Role
from roles.roles import (
    Instructor,
    Staff,
)


@ddt.ddt
class CanReadIfStaffOrSelfTests(MockedESTestCase):
    """
    Tests
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.learner1 = UserFactory.create()
            cls.learner1_username = 'learner1_username'
            cls.learner1.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=cls.learner1_username
            )
            cls.learner2 = UserFactory.create()
            cls.learner2_username = 'learner2_username'
            cls.learner2.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid=cls.learner2_username
            )
            cls.program = ProgramFactory.create()
            cls.staff = UserFactory.create()
            cls.staff_username = 'staff_username'
            for learner in (cls.learner1, cls.learner2):
                ProgramEnrollment.objects.create(
                    program=cls.program,
                    user=learner,
                )

    def test_anonymous_users_blocked(self):
        """
        Test that anonymous users get a 404
        """
        perm = CanReadIfStaffOrSelf()
        request = Mock(user=Mock(is_anonymous=True))
        view = Mock(kwargs={'user': 'username'})
        with self.assertRaises(Http404):
            perm.has_permission(request, view)

    def test_raise_if_requested_record_doesnt_exist(self):
        """
        Test that requests a nonexistent user gives a  404
        """
        for user in (self.learner1, self.staff):
            perm = CanReadIfStaffOrSelf()
            request = Mock(user=user)
            view = Mock(kwargs={'username': 'AFSDFASDFASDF'})
            with self.assertRaises(Http404):
                perm.has_permission(request, view)

    def test_learner_can_get_own_dashboard(self):
        """
        Test that a user can get their own dashboard
        """
        perm = CanReadIfStaffOrSelf()
        request = Mock(user=self.learner1)
        view = Mock(kwargs={'username': self.learner1_username})
        assert perm.has_permission(request, view) is True

    def test_learners_cannot_get_other_learners(self):
        """
        Normal users shouldn't be able to read each other
        """
        perm = CanReadIfStaffOrSelf()
        with mute_signals(post_save):
            request = Mock(user=self.learner1)
            view = Mock(kwargs={'username': self.learner2_username})
            with self.assertRaises(Http404):
                perm.has_permission(request, view)

    @ddt.data(Instructor, Staff)
    def test_staff_can_read_learners(self, role):
        """
        A staff or instructor on a program a learner is also in should
        be able to read their dashboard
        """
        perm = CanReadIfStaffOrSelf()
        with mute_signals(post_save):
            Role.objects.create(
                user=self.staff,
                program=self.program,
                role=role.ROLE_ID,
            )
            request = Mock(user=self.staff)
            view = Mock(kwargs={'username': self.learner1_username})
            assert perm.has_permission(request, view) is True
