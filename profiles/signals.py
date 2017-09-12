"""
Signals for user profiles
"""

import logging

from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from profiles.models import Profile


log = logging.getLogger(__name__)


@receiver(post_save, sender=User, dispatch_uid="create_profile")
def create_user_profile(sender, instance, created, **kwargs):  # pylint: disable=unused-argument
    """
    Signal handler to create a user profile every time a new user is created
    """
    if created:
        log.debug('creating profile for user %s', instance.username)
        Profile.objects.create(user=instance)
