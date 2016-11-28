"""
Models for exams
"""

from django.contrib.auth.models import User
from django.db import models
from django.core.validators import MaxValueValidator

from exams.utils import strip_non_cp_1252_chars


class ProctoredProfile(models.Model):
    """
    A stricter version of a user's profile used for proctored exams.
    """
    user = models.OneToOneField(User, null=False, unique=True)

    updated_on = models.DateTimeField(auto_now=True, db_index=True)
    synced_on = models.DateTimeField(blank=True, null=True, db_index=True)

    first_name = models.TextField(
        max_length=30,
        blank=True,
        null=True
    )
    last_name = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    address1 = models.CharField(
        max_length=40,
        blank=True,
        null=True
    )
    address2 = models.CharField(
        max_length=40,
        blank=True,
        null=True
    )
    address3 = models.CharField(
        max_length=40,
        blank=True,
        null=True
    )

    country = models.CharField(
        max_length=3,
        blank=True,
        null=True
    )
    state_or_territory = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )
    city = models.CharField(
        max_length=32,
        blank=True,
        null=True
    )
    postal_code = models.CharField(
        max_length=16,
        blank=True,
        null=True
    )

    phone_number = models.CharField(
        max_length=35,
        blank=True,
        null=True
    )
    phone_country_code = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[
            MaxValueValidator(999),
        ]
    )

    @classmethod
    def create(cls, profile):
        """
        Creates a new ProctoredProfile from a Profile
        """
        return ProctoredProfile(
            user=profile.user,
            first_name=strip_non_cp_1252_chars(profile.first_name),
            last_name=strip_non_cp_1252_chars(profile.last_name),
            city=strip_non_cp_1252_chars(profile.city),
        )
