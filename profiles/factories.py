"""Factories for making test data"""
from datetime import date, datetime, timezone

from factory import SubFactory, LazyAttribute
from factory.django import (
    DjangoModelFactory,
    ImageField
)
from factory.fuzzy import (
    FuzzyAttribute,
    FuzzyChoice,
    FuzzyDate,
    FuzzyDateTime,
    FuzzyText,
)
import faker
from micromasters.factories import UserFactory
from profiles.models import Employment, Profile, Education


FAKE = faker.Factory.create()


class ProfileFactory(DjangoModelFactory):
    """Factory for Profiles"""
    user = SubFactory(UserFactory)
    filled_out = FuzzyAttribute(FAKE.boolean)
    agreed_to_terms_of_service = FuzzyAttribute(FAKE.boolean)

    first_name = LazyAttribute(lambda x: FAKE.first_name())
    last_name = LazyAttribute(lambda x: FAKE.last_name())
    preferred_name = LazyAttribute(lambda x: FAKE.name())

    account_privacy = FuzzyChoice(
        [choice[0] for choice in Profile.ACCOUNT_PRIVACY_CHOICES]
    )

    email_optin = FuzzyAttribute(FAKE.boolean)

    edx_employer = FuzzyText(suffix=" corp")
    edx_job_title = FuzzyText(suffix=" consultant")
    edx_name = FuzzyText(prefix="User ")
    edx_bio = FuzzyText()

    city = LazyAttribute(lambda x: FAKE.city())
    country = LazyAttribute(lambda x: FAKE.country_code())
    state_or_territory = LazyAttribute(lambda x: FAKE.state())

    birth_country = LazyAttribute(lambda x: FAKE.country_code())
    nationality = LazyAttribute(lambda x: FAKE.country_code())

    has_profile_image = FuzzyAttribute(FAKE.boolean)
    edx_requires_parental_consent = FuzzyAttribute(FAKE.boolean)
    date_of_birth = FuzzyDate(date(1850, 1, 1))
    edx_level_of_education = FuzzyChoice(
        [None] + [choice[0] for choice in Profile.LEVEL_OF_EDUCATION_CHOICES]
    )
    edx_goals = FuzzyText()
    preferred_language = LazyAttribute(lambda x: FAKE.language_code())
    edx_language_proficiencies = FuzzyAttribute(lambda: [FAKE.text() for _ in range(3)])
    gender = FuzzyChoice(
        [choice[0] for choice in Profile.GENDER_CHOICES]
    )
    edx_mailing_address = FuzzyText()
    date_joined_micromasters = FuzzyDateTime(datetime(1850, 1, 1, tzinfo=timezone.utc))
    student_id = None

    image = ImageField()

    class Meta:  # pylint: disable=missing-docstring
        model = Profile


class EmploymentFactory(DjangoModelFactory):
    """
    A factory for work history
    """
    profile = SubFactory(ProfileFactory)
    city = LazyAttribute(lambda x: FAKE.city())
    country = LazyAttribute(lambda x: FAKE.country())
    state_or_territory = LazyAttribute(lambda x: FAKE.state())
    company_name = LazyAttribute(lambda x: FAKE.company())
    industry = FuzzyText(suffix=" IT")
    position = LazyAttribute(lambda x: FAKE.job())
    end_date = FuzzyDate(date(1850, 1, 1))
    start_date = FuzzyDate(date(1850, 1, 1))

    class Meta:  # pylint: disable=missing-docstring
        model = Employment


class EducationFactory(DjangoModelFactory):
    """
    A factory for Education
    """
    profile = SubFactory(ProfileFactory)

    degree_name = FuzzyChoice(
        [choice[0] for choice in Education.DEGREE_CHOICES]
    )
    graduation_date = FuzzyDate(date(2000, 1, 1))
    field_of_study = FuzzyText()
    online_degree = FuzzyAttribute(FAKE.boolean)
    school_name = FuzzyText()
    school_city = LazyAttribute(lambda x: FAKE.city())
    school_state_or_territory = LazyAttribute(lambda x: FAKE.state())
    school_country = LazyAttribute(lambda x: FAKE.country())

    class Meta:  # pylint: disable=missing-docstring
        model = Education
