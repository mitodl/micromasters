"""
Tests for profile serializers
"""

from django.test import TestCase
from django.db.models.signals import post_save
from factory.django import mute_signals
from rest_framework.fields import DateTimeField
from rest_framework.exceptions import ValidationError

from backends.edxorg import EdxOrgOAuth2
from profiles.api import get_social_username
from profiles.factories import (
    EmploymentFactory,
    EducationFactory,
    ProfileFactory,
    UserFactory,
)
from profiles.models import (
    BACHELORS,
    DOCTORATE,
)
from profiles.serializers import (
    EducationSerializer,
    EmploymentSerializer,
    ProfileLimitedSerializer,
    ProfileSerializer,
)
from profiles.util import (
    GravatarImgSize,
    format_gravatar_url,
)


# pylint: disable=no-self-use
class ProfileTests(TestCase):
    """
    Tests for profile serializers
    """

    def create_profile(self):
        """
        Create a profile and social auth
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create()
            profile.user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid="{}_edx".format(profile.user.username)
            )
            return profile

    def test_full(self):  # pylint: disable=no-self-use
        """
        Test full serializer
        """
        profile = self.create_profile()
        assert ProfileSerializer().to_representation(profile) == {
            'username': get_social_username(profile.user),
            'first_name': profile.first_name,
            'filled_out': profile.filled_out,
            'agreed_to_terms_of_service': profile.agreed_to_terms_of_service,
            'last_name': profile.last_name,
            'preferred_name': profile.preferred_name,
            'email_optin': profile.email_optin,
            'gender': profile.gender,
            'date_of_birth': DateTimeField().to_representation(profile.date_of_birth),
            'account_privacy': profile.account_privacy,
            'has_profile_image': profile.has_profile_image,
            'profile_url_full': format_gravatar_url(profile.user.email, GravatarImgSize.FULL),
            'profile_url_large': format_gravatar_url(profile.user.email, GravatarImgSize.LARGE),
            'profile_url_medium': format_gravatar_url(profile.user.email, GravatarImgSize.MEDIUM),
            'profile_url_small': format_gravatar_url(profile.user.email, GravatarImgSize.SMALL),
            'country': profile.country,
            'state_or_territory': profile.state_or_territory,
            'city': profile.city,
            'birth_country': profile.birth_country,
            'birth_state_or_territory': profile.birth_state_or_territory,
            'birth_city': profile.birth_city,
            'preferred_language': profile.preferred_language,
            'pretty_printed_student_id': profile.pretty_printed_student_id,
            'edx_level_of_education': profile.edx_level_of_education,
            'education': [
                EducationSerializer().to_representation(education) for education in profile.education.all()
            ],
            'work_history': [
                EmploymentSerializer().to_representation(work_history) for work_history in
                profile.work_history.all()
            ]
        }

    def test_limited(self):  # pylint: disable=no-self-use
        """
        Test limited serializer
        """
        profile = self.create_profile()
        assert ProfileLimitedSerializer().to_representation(profile) == {
            'username': get_social_username(profile.user),
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'preferred_name': profile.preferred_name,
            'gender': profile.gender,
            'account_privacy': profile.account_privacy,
            'has_profile_image': profile.has_profile_image,
            'profile_url_full': format_gravatar_url(profile.user.email, GravatarImgSize.FULL),
            'profile_url_large': format_gravatar_url(profile.user.email, GravatarImgSize.LARGE),
            'profile_url_medium': format_gravatar_url(profile.user.email, GravatarImgSize.MEDIUM),
            'profile_url_small': format_gravatar_url(profile.user.email, GravatarImgSize.SMALL),
            'country': profile.country,
            'state_or_territory': profile.state_or_territory,
            'city': profile.city,
            'birth_country': profile.birth_country,
            'preferred_language': profile.preferred_language,
            'edx_level_of_education': profile.edx_level_of_education,
            'education': [
                EducationSerializer().to_representation(education) for education in profile.education.all()
            ],
            'work_history': [
                EmploymentSerializer().to_representation(work_history) for work_history in
                profile.work_history.all()
            ]
        }

    def test_add_education(self):
        """
        Test that we handle adding an Education correctly
        """
        education_object = {
            'degree_name': DOCTORATE,
            'graduation_date': '9876-04-23',
            'field_of_study': 'subject',
            'online_degree': True,
            'school_name': 'school_name',
            'school_city': 'school_city',
            'school_state_or_territory': 'school_state_or_territory',
            'school_country': 'school_country,'
        }

        user1 = UserFactory.create()
        user2 = UserFactory.create()
        serializer = ProfileSerializer(instance=user1.profile, data={
            'education': [education_object], 'work_history': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert user1.profile.education.count() == 1
        education = user1.profile.education.first()
        education_object['id'] = education.id
        assert EducationSerializer().to_representation(education) == education_object

        # Other profile did not get the education assigned to it
        assert user2.profile.education.count() == 0

    def test_update_education(self):
        """
        Test that we handle updating an Education correctly
        """
        with mute_signals(post_save):
            education = EducationFactory.create()
        education_object = EducationSerializer().to_representation(education)
        education_object['degree_name'] = BACHELORS

        serializer = ProfileSerializer(instance=education.profile, data={
            'education': [education_object], 'work_history': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert education.profile.education.count() == 1
        education = education.profile.education.first()
        assert EducationSerializer().to_representation(education) == education_object

    def test_update_education_different_profile(self):
        """
        Make sure we can't edit an education for a different profile
        """
        with mute_signals(post_save):
            education1 = EducationFactory.create()
            education2 = EducationFactory.create()
        education_object = EducationSerializer().to_representation(education1)
        education_object['id'] = education2.id

        serializer = ProfileSerializer(instance=education1.profile, data={
            'education': [education_object], 'work_history': []
        })
        serializer.is_valid(raise_exception=True)
        with self.assertRaises(ValidationError) as ex:
            serializer.save()
        assert ex.exception.detail == ["Education {} does not exist".format(education2.id)]

    def test_delete_education(self):
        """
        Test that we delete Educations which aren't specified in the PATCH
        """
        with mute_signals(post_save):
            education1 = EducationFactory.create()
            EducationFactory.create(profile=education1.profile)
            # has a different profile
            education3 = EducationFactory.create()

        assert education1.profile.education.count() == 2
        education_object1 = EducationSerializer().to_representation(education1)
        serializer = ProfileSerializer(instance=education1.profile, data={
            'education': [education_object1], 'work_history': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert education1.profile.education.count() == 1
        assert education1.profile.education.first() == education1

        # Other profile is unaffected
        assert education3.profile.education.count() == 1

    def test_add_employment(self):
        """
        Test that we handle adding an employment correctly
        """
        employment_object = {
            "city": "NY",
            "state_or_territory": "NY",
            "country": "USA",
            "company_name": "XYZ-ABC",
            "position": "SSE",
            "industry": "IT",
            "end_date": "2016-05-17",
            "start_date": "2016-05-28"
        }

        user1 = UserFactory.create()
        user2 = UserFactory.create()
        serializer = ProfileSerializer(instance=user1.profile, data={
            'work_history': [employment_object], 'education': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert user1.profile.work_history.count() == 1
        employment = user1.profile.work_history.first()
        employment_object['id'] = employment.id
        assert EmploymentSerializer().to_representation(employment) == employment_object

        # Other profile did not get the employment assigned to it
        assert user2.profile.work_history.count() == 0

    def test_update_employment(self):
        """
        Test that we handle updating an employment correctly
        """
        with mute_signals(post_save):
            employment = EmploymentFactory.create()
        employment_object = EmploymentSerializer().to_representation(employment)
        employment_object['position'] = "SE"

        serializer = ProfileSerializer(instance=employment.profile, data={
            'work_history': [employment_object], 'education': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert employment.profile.work_history.count() == 1
        employment = employment.profile.work_history.first()
        assert EmploymentSerializer().to_representation(employment) == employment_object

    def test_update_employment_different_profile(self):
        """
        Make sure we can't edit an employment for a different profile
        """
        with mute_signals(post_save):
            employment1 = EmploymentFactory.create()
            employment2 = EmploymentFactory.create()
        employment_object = EmploymentSerializer().to_representation(employment1)
        employment_object['id'] = employment2.id

        serializer = ProfileSerializer(instance=employment1.profile, data={
            'work_history': [employment_object], 'education': []
        })
        serializer.is_valid(raise_exception=True)
        with self.assertRaises(ValidationError) as ex:
            serializer.save()
        assert ex.exception.detail == ["Work history {} does not exist".format(employment2.id)]

    def test_delete_employment(self):
        """
        Test that we delete employments which aren't specified in the PATCH
        """
        with mute_signals(post_save):
            employment1 = EmploymentFactory.create()
            EmploymentFactory.create(profile=employment1.profile)
            # has a different profile
            employment3 = EmploymentFactory.create()

        assert employment1.profile.work_history.count() == 2
        employment_object1 = EmploymentSerializer().to_representation(employment1)
        serializer = ProfileSerializer(instance=employment1.profile, data={
            'work_history': [employment_object1], 'education': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert employment1.profile.work_history.count() == 1
        assert employment1.profile.work_history.first() == employment1

        # Other profile is unaffected
        assert employment3.profile.work_history.count() == 1
