"""
Models for user profile
"""
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.db import models, transaction

from profiles.util import (
    profile_image_upload_uri,
    profile_image_upload_uri_small,
    profile_image_upload_uri_medium,
    split_at_space,
)


DOCTORATE = 'p'
MASTERS = 'm'
BACHELORS = 'b'
ASSOCIATE = 'a'
HIGH_SCHOOL = 'hs'
JUNIOR_HIGH_SCHOOL = 'jhs'
ELEMENTARY = 'el'
NO_FORMAL_EDUCATION = 'none'
OTHER_EDUCATION = 'other'


class Employment(models.Model):
    """
    A user work_history
    """
    city = models.TextField()
    company_name = models.TextField()
    country = models.TextField()
    industry = models.TextField()
    position = models.TextField()
    state_or_territory = models.TextField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    profile = models.ForeignKey('Profile', on_delete=models.CASCADE, related_name='work_history')

    def __str__(self):
        return 'Employment history for "{0}"'.format(self.profile.user.username)


class Profile(models.Model):
    """
    A user profile
    """
    PRIVATE = 'private'
    PUBLIC_TO_MM = 'public_to_mm'
    PUBLIC = 'public'
    ACCOUNT_PRIVACY_CHOICES = (
        (PRIVATE, 'Private'),
        (PUBLIC_TO_MM, 'Public to logged in users'),
        (PUBLIC, 'Public to everyone'),
    )

    # Defined in edX UserProfile model
    MALE = 'm'
    FEMALE = 'f'
    OTHER = 'o'
    GENDER_CHOICES = (
        (MALE, 'Male'),
        (FEMALE, 'Female'),
        (OTHER, 'Other/Prefer Not to Say'),
    )

    LEVEL_OF_EDUCATION_CHOICES = (
        (DOCTORATE, 'Doctorate'),
        (MASTERS, "Master's or professional degree"),
        (BACHELORS, "Bachelor's degree"),
        (ASSOCIATE, "Associate degree"),
        (HIGH_SCHOOL, "High school"),
        (JUNIOR_HIGH_SCHOOL, "Junior high school"),
        (ELEMENTARY, "Elementary school"),
        (NO_FORMAL_EDUCATION, "No formal education"),
        (OTHER_EDUCATION, "Other education"),
    )

    user = models.OneToOneField(User)

    # Is the profile filled out yet?
    filled_out = models.BooleanField(default=False)
    agreed_to_terms_of_service = models.BooleanField(default=False)

    # is the user a verified micromaster user?
    verified_micromaster_user = models.BooleanField(default=False)

    # Defining these here instead of in User to avoid Django's 30 character max limit
    first_name = models.TextField(blank=True, null=True)
    last_name = models.TextField(blank=True, null=True)
    preferred_name = models.TextField(blank=True, null=True)

    account_privacy = models.TextField(
        default=PUBLIC_TO_MM,
        choices=ACCOUNT_PRIVACY_CHOICES,
    )

    # Has user opted to receive email?
    email_optin = models.BooleanField(default=False)

    edx_employer = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    edx_job_title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    edx_name = models.TextField(blank=True, null=True)
    edx_bio = models.TextField(blank=True, null=True)

    # Romanized names
    romanized_first_name = models.CharField(blank=True, null=True, max_length=30)
    romanized_last_name = models.CharField(blank=True, null=True, max_length=50)

    address = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    postal_code = models.CharField(
        max_length=16,
        blank=True,
        null=True
    )
    city = models.TextField(blank=True, null=True)
    country = models.TextField(blank=True, null=True)
    state_or_territory = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    phone_number = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    birth_country = models.TextField(blank=True, null=True)
    nationality = models.TextField(blank=True, null=True)
    about_me = models.TextField(blank=True, null=True)

    image = models.ImageField(upload_to=profile_image_upload_uri, null=True)
    image_small = models.ImageField(upload_to=profile_image_upload_uri_small, null=True)
    image_medium = models.ImageField(upload_to=profile_image_upload_uri_medium, null=True)

    edx_requires_parental_consent = models.NullBooleanField()
    date_of_birth = models.DateField(blank=True, null=True)
    edx_level_of_education = models.TextField(
        max_length=6,
        choices=LEVEL_OF_EDUCATION_CHOICES,
        blank=True,
        null=True,
    )
    edx_goals = models.TextField(blank=True, null=True)
    preferred_language = models.TextField(blank=True, null=True)
    edx_language_proficiencies = JSONField(blank=True, null=True)
    gender = models.CharField(
        max_length=6,
        choices=GENDER_CHOICES,
        blank=True,
        null=True,
    )
    edx_mailing_address = models.TextField(blank=True, null=True)
    date_joined_micromasters = models.DateTimeField(blank=True, null=True, auto_now_add=True)
    student_id = models.IntegerField(blank=True, null=True, unique=True)

    updated_on = models.DateTimeField(blank=True, null=True, auto_now=True)

    @transaction.atomic
    def save(self, *args, **kwargs):
        """Set the student_id number to the PK number"""
        # first save the profile
        super(Profile, self).save(*args, **kwargs)
        # if there is no student id, assign the same number of the primary key
        if self.student_id is None:
            self.student_id = self.id
            super(Profile, self).save()

    def __str__(self):
        return 'Profile for "{0}"'.format(self.user.username)

    @property
    def pretty_printed_student_id(self):
        """pretty prints the student id for easy display"""
        return "MMM{0:06}".format(self.student_id) if self.student_id else ""

    @property
    def email(self):
        """email of user"""
        return self.user.email

    # Split the `address` field into three fields, max 40 characters each.
    # These fields are used in the Pearson export.

    def _split_address(self):
        if self.address is None:
            return (None, None, None)

        address1, rest = split_at_space(self.address, max_length=40)
        address2, address3 = split_at_space(rest.strip(), max_length=40)
        return (address1.strip(), address2.strip(), address3.strip())

    @property
    def address1(self):
        """First line of address"""
        return self._split_address()[0]

    @property
    def address2(self):
        """Second line of address"""
        return self._split_address()[1]

    @property
    def address3(self):
        """Third line of address"""
        return self._split_address()[2]


class Education(models.Model):
    """
    A user education
    """
    DEGREE_CHOICES = (
        (DOCTORATE, 'Doctorate'),
        (MASTERS, "Master's or professional degree"),
        (BACHELORS, "Bachelor's degree"),
        (ASSOCIATE, "Associate degree"),
        (HIGH_SCHOOL, "High school"),
        (OTHER_EDUCATION, "Other education"),
    )
    profile = models.ForeignKey(Profile, related_name='education')
    degree_name = models.CharField(max_length=30, choices=DEGREE_CHOICES)
    graduation_date = models.DateField()
    field_of_study = models.TextField(blank=True, null=True)
    online_degree = models.BooleanField(default=False)
    school_name = models.TextField()
    school_city = models.TextField()
    school_state_or_territory = models.TextField()
    school_country = models.TextField()
