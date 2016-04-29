"""Factories for making test data"""
from datetime import date, datetime, timezone

from django.contrib.auth.models import User
from factory import (
    Sequence,
    SubFactory,
)
from factory.django import DjangoModelFactory
from factory.fuzzy import (
    FuzzyAttribute,
    FuzzyChoice,
    FuzzyDate,
    FuzzyInteger,
    FuzzyDateTime,
    FuzzyText,
)
import faker

from profiles.models import Profile, Education


FAKE = faker.Factory.create()


class UserFactory(DjangoModelFactory):
    """Factory for Users"""
    username = Sequence(lambda n: "user_%d" % n)

    class Meta:  # pylint: disable=missing-docstring,no-init,too-few-public-methods,old-style-class
        model = User


class ProfileFactory(DjangoModelFactory):
    """Factory for Profiles"""
    user = SubFactory(UserFactory)
    filled_out = FuzzyAttribute(FAKE.boolean)

    first_name = FuzzyText()
    last_name = FuzzyText()
    preferred_name = FuzzyText()

    account_privacy = FuzzyChoice(
        [choice[0] for choice in Profile.ACCOUNT_PRIVACY_CHOICES]
    )

    email_optin = FuzzyAttribute(FAKE.boolean)

    edx_employer = FuzzyText(suffix=" corp")
    edx_job_title = FuzzyText(suffix=" consultant")
    edx_name = FuzzyText(prefix="User ")
    edx_bio = FuzzyText()

    city = FuzzyText(suffix=" city")
    country = FuzzyText(suffix="land")
    state_or_territory = FuzzyText(suffix=" state")

    birth_city = FuzzyText(suffix=" city")
    birth_country = FuzzyText(suffix="land")
    birth_state_or_territory = FuzzyText(suffix=" state")

    has_profile_image = FuzzyAttribute(FAKE.boolean)
    profile_url_full = FuzzyText(prefix="http://")
    profile_url_large = FuzzyText(prefix="http://")
    profile_url_medium = FuzzyText(prefix="http://")
    profile_url_small = FuzzyText(prefix="http://")
    edx_requires_parental_consent = FuzzyAttribute(FAKE.boolean)
    date_of_birth = FuzzyDate(date(1850, 1, 1))
    edx_level_of_education = FuzzyChoice(
        [choice[0] for choice in Profile.LEVEL_OF_EDUCATION_CHOICES]
    )
    edx_goals = FuzzyText()
    preferred_language = FuzzyText(suffix=" language")
    edx_language_proficiencies = FuzzyAttribute(lambda: [FAKE.text() for _ in range(3)])
    gender = FuzzyChoice(
        [choice[0] for choice in Profile.GENDER_CHOICES]
    )
    edx_mailing_address = FuzzyText()
    date_joined_micromasters = FuzzyDateTime(datetime(1850, 1, 1, tzinfo=timezone.utc))
    student_id = FuzzyInteger(1, 1000)

    class Meta:  # pylint: disable=missing-docstring
        model = Profile


class EducationFactory(DjangoModelFactory):
    """
    A factory for Education
    """
    profile = SubFactory(ProfileFactory)

    degree_name = FuzzyChoice(
        [choice[0] for choice in Education.DEGREE_CHOICES]
    )
    graduation_date = FuzzyDate(date(2000, 1, 1))
    subject = FuzzyText()
    school_name = FuzzyText()
    school_city = FuzzyText()
    school_country = FuzzyText()

    class Meta:  # pylint: disable=missing-docstring
        model = Education
