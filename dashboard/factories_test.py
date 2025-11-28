"""
Tests for dashboard factories
"""
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import FullProgramFactory, ProgramFactory
from dashboard.factories import CachedEnrollmentFactory
from ecommerce.models import Line, Order
from micromasters.factories import UserFactory
from profiles.factories import ProfileFactory
from search.base import MockedESTestCase


class DashboardFactoryTests(MockedESTestCase):
    """
    Tests for dashboard factories
    """
    def test_verified_enroll_factory_fa_create(self):
        """
        Tests that CachedEnrollmentFactory creates additional data for a FA-enabled course run
        """
        assert Line.objects.count() == 0
        with mute_signals(post_save):
            user = UserFactory.create()
            ProfileFactory.create(user=user)
        fa_program = FullProgramFactory.create(financial_aid_availability=True)
        CachedEnrollmentFactory.create(user=user, course_run__course__program=fa_program, verified=True)
        lines = Line.objects.all()
        assert len(lines) == 1
        assert lines[0].order.status == Order.FULFILLED

    def test_verified_enrollment_factory_fa_build(self):
        """
        Tests that CachedEnrollmentFactory does not run create Order/Line on .build()
        """
        assert Line.objects.count() == 0
        with mute_signals(post_save):
            user = UserFactory.create()
        fa_program = ProgramFactory.create(financial_aid_availability=True)
        CachedEnrollmentFactory.build(user=user, course_run__course__program=fa_program, verified=True)
        assert Line.objects.count() == 0
