"""Factories for making test data"""
from datetime import date, datetime, timezone

from factory import SubFactory, LazyFunction, Faker, lazy_attribute
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
    filled_out = Faker('boolean')
    agreed_to_terms_of_service = Faker('boolean')

    first_name = Faker('first_name')
    last_name = Faker('last_name')
    preferred_name = Faker('name')

    account_privacy = FuzzyChoice(
        [choice[0] for choice in Profile.ACCOUNT_PRIVACY_CHOICES]
    )

    email_optin = Faker('boolean')

    edx_employer = FuzzyText(suffix=" corp")
    edx_job_title = FuzzyText(suffix=" consultant")
    edx_name = FuzzyText(prefix="User ")
    edx_bio = FuzzyText()
    about_me = FuzzyText()

    romanized_first_name = Faker('first_name')
    romanized_last_name = Faker('last_name')

    address = LazyFunction(lambda: '{} {}'.format(FAKE.building_number(), FAKE.street_name()))

    city = Faker('city')
    country = Faker('country_code')
    state_or_territory = Faker('state')

    @lazy_attribute
    def postal_code(self):
        """Postal codes are only required for US and Canada"""
        if self.country in ("US", "CA"):
            return FAKE.postcode()
        return None

    phone_number = Faker('numerify', text='+# (###) ###-####')

    birth_country = Faker('country_code')
    nationality = Faker('country_code')

    edx_requires_parental_consent = Faker('boolean')
    date_of_birth = FuzzyDate(date(1850, 1, 1))
    edx_level_of_education = FuzzyChoice(
        [None] + [choice[0] for choice in Profile.LEVEL_OF_EDUCATION_CHOICES]
    )
    edx_goals = FuzzyText()
    preferred_language = Faker('language_code')
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
    city = Faker('city')
    country = Faker('country')
    state_or_territory = Faker('state')
    company_name = Faker('company')
    industry = FuzzyText(suffix=" IT")
    position = Faker('job')
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
    online_degree = Faker('boolean')
    school_name = FuzzyText()
    school_city = Faker('city')
    school_state_or_territory = Faker('state')
    school_country = Faker('country')

    class Meta:  # pylint: disable=missing-docstring
        model = Education
