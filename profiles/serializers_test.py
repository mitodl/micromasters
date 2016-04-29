"""
Tests for profile serializers
"""

from django.test import TestCase
from django.db.models.signals import post_save
from factory.django import mute_signals
from rest_framework.fields import DateTimeField
from rest_framework.exceptions import ValidationError

from profiles.factories import (
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
    ProfileLimitedSerializer,
    ProfilePrivateSerializer,
    ProfileSerializer,
)


# pylint: disable=no-self-use
class ProfileTests(TestCase):
    """
    Tests for profile serializers
    """

    def test_full(self):  # pylint: disable=no-self-use
        """
        Test full serializer
        """
        profile = ProfileFactory.build()
        assert ProfileSerializer().to_representation(profile) == {
            'first_name': profile.first_name,
            'filled_out': profile.filled_out,
            'last_name': profile.last_name,
            'preferred_name': profile.preferred_name,
            'email_optin': profile.email_optin,
            'gender': profile.gender,
            'date_of_birth': DateTimeField().to_representation(profile.date_of_birth),
            'account_privacy': profile.account_privacy,
            'has_profile_image': profile.has_profile_image,
            'profile_url_full': profile.profile_url_full,
            'profile_url_large': profile.profile_url_large,
            'profile_url_medium': profile.profile_url_medium,
            'profile_url_small': profile.profile_url_small,
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
            ]
        }

    def test_limited(self):  # pylint: disable=no-self-use
        """
        Test limited serializer
        """
        profile = ProfileFactory.build()
        assert ProfileLimitedSerializer().to_representation(profile) == {
            'preferred_name': profile.preferred_name,
            'account_privacy': profile.account_privacy,
            'has_profile_image': profile.has_profile_image,
            'profile_url_full': profile.profile_url_full,
            'profile_url_large': profile.profile_url_large,
            'profile_url_medium': profile.profile_url_medium,
            'profile_url_small': profile.profile_url_small,
            'city': profile.city,
            'country': profile.country,
            'state_or_territory': profile.state_or_territory,
        }

    def test_private(self):  # pylint: disable=no-self-use
        """
        Test private serializer
        """
        profile = ProfileFactory.build()
        assert ProfilePrivateSerializer().to_representation(profile) == {
            'account_privacy': profile.account_privacy,
            'has_profile_image': profile.has_profile_image,
            'profile_url_full': profile.profile_url_full,
            'profile_url_large': profile.profile_url_large,
            'profile_url_medium': profile.profile_url_medium,
            'profile_url_small': profile.profile_url_small,
        }

    def test_readonly(self):
        """
        Test that certain fields cannot be altered
        """
        assert ProfileSerializer.Meta.read_only_fields == ('filled_out',)

    def test_add_education(self):
        """
        Test that we handle adding an Education correctly
        """
        education_object = {
            'degree_name': DOCTORATE,
            'graduation_date': '9876-04-23',
            'subject': 'subject',
            'school_name': 'school_name',
            'school_city': 'school_city',
            'school_country': 'school_country,'
        }

        user1 = UserFactory.create()
        user2 = UserFactory.create()
        serializer = ProfileSerializer(instance=user1.profile, data={
            'education': [education_object]
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
            'education': [education_object]
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
            'education': [education_object]
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
            'education': [education_object1]
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert education1.profile.education.count() == 1
        assert education1.profile.education.first() == education1

        # Other profile is unaffected
        assert education3.profile.education.count() == 1
