"""
Models for exams
"""
from django.contrib.auth.models import User
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator


import uuid


class ProctoredProfile(models.Model):
    """
    A stricter version of a user's profile used for proctored exams.
    """
    user = models.ForeignKey(User, null=False, unique=True)

    updated_on = models.DateTimeField(auto_now=True)
    synced_on = models.DateTimeField(blank=True, null=True)

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
