"""
Tests for dashboard factories
"""
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import ProgramFactory
from dashboard.factories import CachedEnrollmentVerifiedFactory
from ecommerce.models import Line, Order
from micromasters.factories import UserFactory
from search.base import MockedESTestCase
from profiles.factories import ProfileFactory


class DashboardFactoryTests(MockedESTestCase):
    """
    Tests for dashboard factories
    """
    def test_verified_enroll_factory_fa_create(self):
        """
        Tests that CachedEnrollmentVerifiedFactory creates additional data for a FA-enabled course run
        """
        assert Line.objects.count() == 0
        with mute_signals(post_save):
            user = UserFactory.create()
            ProfileFactory.create(user=user)
        fa_program = ProgramFactory.create(financial_aid_availability=True, full=True)
        CachedEnrollmentVerifiedFactory.create(user=user, course_run__course__program=fa_program)
        lines = Line.objects.all()
        assert len(lines) == 1
        assert lines[0].order.status == Order.FULFILLED

    def test_verified_enrollment_factory_fa_build(self):
        """
        Tests that CachedEnrollmentVerifiedFactory does not run post-generation on .build()
        """
        assert Line.objects.count() == 0
        with mute_signals(post_save):
            user = UserFactory.create()
        fa_program = ProgramFactory.create(financial_aid_availability=True)
        CachedEnrollmentVerifiedFactory.build(user=user, course_run__course__program=fa_program)
        assert Line.objects.count() == 0
