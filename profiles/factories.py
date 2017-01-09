"""Factories for making test data"""
from datetime import date, datetime, timezone

from factory import SubFactory, LazyFunction
from factory.django import (
    DjangoModelFactory,
    ImageField
)
from factory.fuzzy import (
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
    filled_out = LazyFunction(FAKE.boolean)
    agreed_to_terms_of_service = LazyFunction(FAKE.boolean)

    first_name = LazyFunction(FAKE.first_name)
    last_name = LazyFunction(FAKE.last_name)
    preferred_name = LazyFunction(FAKE.name)

    account_privacy = FuzzyChoice(
        [choice[0] for choice in Profile.ACCOUNT_PRIVACY_CHOICES]
    )

    email_optin = LazyFunction(FAKE.boolean)

    edx_employer = FuzzyText(suffix=" corp")
    edx_job_title = FuzzyText(suffix=" consultant")
    edx_name = FuzzyText(prefix="User ")
    edx_bio = FuzzyText()
    about_me = FuzzyText()

    romanized_first_name = LazyFunction(FAKE.first_name)
    romanized_last_name = LazyFunction(FAKE.last_name)

    address1 = LazyFunction(lambda: '{} {}'.format(FAKE.building_number(), FAKE.street_name()))
    address2 = LazyFunction(FAKE.secondary_address)
    address3 = None

    postal_code = LazyFunction(FAKE.postcode)
    city = LazyFunction(FAKE.city)
    country = LazyFunction(FAKE.country_code)
    state_or_territory = LazyFunction(FAKE.state)

    phone_number = LazyFunction(lambda: FAKE.numerify('###-###-####'))
    phone_country_code = LazyFunction(lambda: FAKE.numerify('###'))

    birth_country = LazyFunction(FAKE.country_code)
    nationality = LazyFunction(FAKE.country_code)

    edx_requires_parental_consent = LazyFunction(FAKE.boolean)
    date_of_birth = FuzzyDate(date(1850, 1, 1))
    edx_level_of_education = FuzzyChoice(
        [None] + [choice[0] for choice in Profile.LEVEL_OF_EDUCATION_CHOICES]
    )
    edx_goals = FuzzyText()
    preferred_language = LazyFunction(FAKE.language_code)
    edx_language_proficiencies = LazyFunction(lambda: [FAKE.text() for _ in range(3)])
    gender = FuzzyChoice(
        [choice[0] for choice in Profile.GENDER_CHOICES]
    )
    edx_mailing_address = FuzzyText()
    date_joined_micromasters = FuzzyDateTime(datetime(1850, 1, 1, tzinfo=timezone.utc))
    student_id = None

    image = ImageField()
    image_small = ImageField()
    image_medium = ImageField()

    updated_on = FuzzyDateTime(datetime(1850, 1, 1, tzinfo=timezone.utc))

    class Meta:  # pylint: disable=missing-docstring
        model = Profile


class EmploymentFactory(DjangoModelFactory):
    """
    A factory for work history
    """
    profile = SubFactory(ProfileFactory)
    city = LazyFunction(FAKE.city)
    country = LazyFunction(FAKE.country)
    state_or_territory = LazyFunction(FAKE.state)
    company_name = LazyFunction(FAKE.company)
    industry = FuzzyText(suffix=" IT")
    position = LazyFunction(FAKE.job)
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
    online_degree = LazyFunction(FAKE.boolean)
    school_name = FuzzyText()
    school_city = LazyFunction(FAKE.city)
    school_state_or_territory = LazyFunction(FAKE.state)
    school_country = LazyFunction(FAKE.country)

    class Meta:  # pylint: disable=missing-docstring
        model = Education
