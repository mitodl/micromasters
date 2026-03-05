"""
Tests for the dashboard permissions
"""
from unittest.mock import Mock

import ddt
from django.db.models.signals import post_save
from django.http import Http404
from factory.django import mute_signals

from courses.factories import ProgramFactory
from dashboard.models import ProgramEnrollment
from dashboard.permissions import CanReadIfStaffOrSelf
from micromasters.factories import SocialUserFactory
from roles.models import Role
from roles.roles import Instructor, Staff
from search.base import MockedESTestCase


@ddt.ddt
class CanReadIfStaffOrSelfTests(MockedESTestCase):
    """
    Tests
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.learner1 = SocialUserFactory.create()
            cls.learner2 = SocialUserFactory.create()
            cls.program = ProgramFactory.create()
            cls.staff = SocialUserFactory.create()
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
        view = Mock(kwargs={'username': self.learner1.username})
        assert perm.has_permission(request, view) is True

    def test_learners_cannot_get_other_learners(self):
        """
        Normal users shouldn't be able to read each other
        """
        perm = CanReadIfStaffOrSelf()
        with mute_signals(post_save):
            request = Mock(user=self.learner1)
            view = Mock(kwargs={'username': self.learner2.username})
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
            view = Mock(kwargs={'username': self.learner1.username})
            assert perm.has_permission(request, view) is True
