"""
Utility functions that produce test data for the selenium test suite
"""
from datetime import timedelta
from django.db.models.signals import post_save
from factory.django import mute_signals

from micromasters.utils import now_in_utc
from search.indexing_api import index_program_enrolled_users
from dashboard.models import (
    ProgramEnrollment,
    UserCacheRefreshTime,
)
from profiles.factories import SocialProfileFactory
from selenium_tests.util import DEFAULT_PASSWORD


def create_user_batch(num_to_create, is_staff=False):
    """Create a batch of test users"""
    profiles = SocialProfileFactory.create_batch(
        num_to_create,
        validated=True,
        user__is_staff=is_staff,
    )
    return [profile.user for profile in profiles]


def create_enrolled_user_batch(num_to_create, program, **kwargs):
    """Create a batch of users enrolled in a program"""
    with mute_signals(post_save):
        new_users = create_user_batch(num_to_create, **kwargs)
        program_enrollments = [
            ProgramEnrollment.objects.create(
                program=program,
                user=user
            )
            for user in new_users
        ]
    index_program_enrolled_users(program_enrollments)
    return program_enrollments


def create_user_for_login(is_staff=True, username=None):
    """Create a test user that can log into the app"""
    later = now_in_utc() + timedelta(weeks=5000)
    with mute_signals(post_save):
        user = SocialProfileFactory.create(
            validated=True,
            user__is_staff=is_staff,
            image=None,  # make these None so the default image is used
            image_small=None,
            image_medium=None,
            **({'user__username': username} if username is not None else {}),
            user__social_auth__extra_data={
                'access_token': 'fake',
                'refresh_token': 'fake',
                'updated_at': later.timestamp(),
                'expires_in': 3600,
            }
        ).user

    UserCacheRefreshTime.objects.create(
        user=user,
        enrollment=later,
        certificate=later,
        current_grade=later,
    )
    user.set_password(DEFAULT_PASSWORD)
    user.save()
    return user
