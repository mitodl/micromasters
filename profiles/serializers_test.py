"""
Tests for profile serializers
"""
from copy import deepcopy
from datetime import date

from django.db.models.signals import post_save
from factory.django import mute_signals
from rest_framework.fields import (
    CharField,
    ReadOnlyField,
    SerializerMethodField,
)
from rest_framework.serializers import ListSerializer
from rest_framework.exceptions import ValidationError

from backends.edxorg import EdxOrgOAuth2
from micromasters.factories import UserFactory
from profiles.api import get_social_username
from profiles.factories import (
    EmploymentFactory,
    EducationFactory,
    ProfileFactory,
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
    ProfileFilledOutSerializer,
)
from search.base import MockedESTestCase


class ProfileTests(MockedESTestCase):
    """
    Tests for profile serializers
    """

    def create_profile(self, **kwargs):
        """
        Create a profile and social auth
        """
        with mute_signals(post_save):
            profile = ProfileFactory.create(**kwargs)
            profile.user.social_auth.create(
                provider=EdxOrgOAuth2.name,
                uid="{}_edx".format(profile.user.username)
            )
            return profile

    def test_full(self):
        """
        Test full serializer
        """
        birthdate = date(1980, 1, 2)
        profile = self.create_profile(date_of_birth=birthdate)
        data = ProfileSerializer(profile).data
        assert data == {
            'username': get_social_username(profile.user),
            'first_name': profile.first_name,
            'full_name': profile.full_name,
            'filled_out': profile.filled_out,
            'agreed_to_terms_of_service': profile.agreed_to_terms_of_service,
            'last_name': profile.last_name,
            'preferred_name': profile.preferred_name,
            'email_optin': profile.email_optin,
            'email': profile.email,
            'gender': profile.gender,
            'date_of_birth': "1980-01-02",
            'account_privacy': profile.account_privacy,
            'country': profile.country,
            'state_or_territory': profile.state_or_territory,
            'city': profile.city,
            'address': profile.address,
            'postal_code': profile.postal_code,
            'birth_country': profile.birth_country,
            'nationality': profile.nationality,
            'preferred_language': profile.preferred_language,
            'pretty_printed_student_id': profile.pretty_printed_student_id,
            'edx_level_of_education': profile.edx_level_of_education,
            'education': EducationSerializer(profile.education.all(), many=True).data,
            'work_history': (
                EmploymentSerializer(profile.work_history.all(), many=True).data
            ),
            'image': profile.image.url,
            'image_small': profile.image_small.url,
            'image_medium': profile.image_medium.url,
            'about_me': profile.about_me,
            'romanized_first_name': profile.romanized_first_name,
            'romanized_last_name': profile.romanized_last_name,
            'phone_number': profile.phone_number,
            'student_id': profile.student_id,
        }

    def test_limited(self):
        """
        Test limited serializer
        """
        profile = self.create_profile()
        data = ProfileLimitedSerializer(profile).data
        assert data == {
            'username': get_social_username(profile.user),
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'full_name': profile.full_name,
            'preferred_name': profile.preferred_name,
            'gender': profile.gender,
            'account_privacy': profile.account_privacy,
            'country': profile.country,
            'state_or_territory': profile.state_or_territory,
            'city': profile.city,
            'birth_country': profile.birth_country,
            'preferred_language': profile.preferred_language,
            'edx_level_of_education': profile.edx_level_of_education,
            'education': EducationSerializer(profile.education.all(), many=True).data,
            'work_history': (
                EmploymentSerializer(profile.work_history.all(), many=True).data
            ),
            'image_medium': profile.image_medium.url,
            'about_me': profile.about_me,
            'romanized_first_name': profile.romanized_first_name,
            'romanized_last_name': profile.romanized_last_name,
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
        education_data = EducationSerializer(education).data
        assert education_data == education_object

        # Other profile did not get the education assigned to it
        assert user2.profile.education.count() == 0

    def test_update_education(self):
        """
        Test that we handle updating an Education correctly
        """
        with mute_signals(post_save):
            education = EducationFactory.create()
        education_data = EducationSerializer(education).data
        education_data['degree_name'] = BACHELORS

        serializer = ProfileSerializer(instance=education.profile, data={
            'education': [education_data], 'work_history': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert education.profile.education.count() == 1
        education = education.profile.education.first()
        assert EducationSerializer(education).data == education_data

    def test_update_education_different_profile(self):
        """
        Make sure we can't edit an education for a different profile
        """
        with mute_signals(post_save):
            education1 = EducationFactory.create()
            education2 = EducationFactory.create()
        education_object = EducationSerializer(education1).data
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
        education_object1 = EducationSerializer(education1).data
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
        assert EmploymentSerializer(employment).data == employment_object

        # Other profile did not get the employment assigned to it
        assert user2.profile.work_history.count() == 0

    def test_update_employment(self):
        """
        Test that we handle updating an employment correctly
        """
        with mute_signals(post_save):
            employment = EmploymentFactory.create()
        employment_object = EmploymentSerializer(employment).data
        employment_object['position'] = "SE"

        serializer = ProfileSerializer(instance=employment.profile, data={
            'work_history': [employment_object], 'education': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert employment.profile.work_history.count() == 1
        employment = employment.profile.work_history.first()
        assert EmploymentSerializer(employment).data == employment_object

    def test_update_employment_different_profile(self):
        """
        Make sure we can't edit an employment for a different profile
        """
        with mute_signals(post_save):
            employment1 = EmploymentFactory.create()
            employment2 = EmploymentFactory.create()
        employment_object = EmploymentSerializer(employment1).data
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
        employment_object1 = EmploymentSerializer(employment1).data
        serializer = ProfileSerializer(instance=employment1.profile, data={
            'work_history': [employment_object1], 'education': []
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()

        assert employment1.profile.work_history.count() == 1
        assert employment1.profile.work_history.first() == employment1

        # Other profile is unaffected
        assert employment3.profile.work_history.count() == 1


class ProfileFilledOutTests(MockedESTestCase):
    """Tests for validating filled out profiles"""

    @classmethod
    def setUpTestData(cls):
        """
        Create a profile and social auth
        """
        with mute_signals(post_save):
            cls.profile = ProfileFactory.create(
                filled_out=True,
                agreed_to_terms_of_service=True,
            )
        EmploymentFactory.create(profile=cls.profile)
        EducationFactory.create(profile=cls.profile)
        cls.profile.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.profile.user.username)
        )

    def setUp(self):
        """
        Create a profile and social auth
        """
        super().setUp()
        serializer = ProfileFilledOutSerializer(self.profile)
        self.data = serializer.data
        self.profile.refresh_from_db()

    def assert_required_fields(self, field_names, parent_getter, field_parent_getter):
        """
        Helper function to assert required fields
        """
        for key in field_names:
            field = field_parent_getter(ProfileFilledOutSerializer().fields)[key]
            is_generated = isinstance(field, (ListSerializer, SerializerMethodField, ReadOnlyField))
            is_skippable = (field.read_only or field.allow_null or field.allow_blank)
            # skip fields that are skippable, generated, read only, or that tie
            #  to other serializers which are tested elsewhere.
            if is_generated or is_skippable:
                continue

            clone = deepcopy(self.data)
            clone["image"] = self.profile.image
            clone["image_small"] = self.profile.image_small
            clone["image_medium"] = self.profile.image_medium
            parent_getter(clone)[key] = None
            with self.assertRaises(ValidationError) as ex:
                ProfileFilledOutSerializer(data=clone).is_valid(raise_exception=True)
            assert parent_getter(ex.exception.args[0]) == {key: ['This field may not be null.']}

            if isinstance(field, CharField):
                # test blank string too
                parent_getter(clone)[key] = ""
                with self.assertRaises(ValidationError) as ex:
                    ProfileFilledOutSerializer(data=clone).is_valid(raise_exception=True)
                assert parent_getter(ex.exception.args[0]) == {key: ['This field may not be blank.']}

    def test_success(self):
        """
        Test a successful validation
        """
        self.data["image"] = self.profile.image
        ProfileFilledOutSerializer(data=self.data).is_valid(raise_exception=True)

    def test_filled_out_false(self):
        """
        filled_out cannot be set to false
        """
        self.data['filled_out'] = False
        self.data['image'] = self.profile.image
        with self.assertRaises(ValidationError) as ex:
            ProfileFilledOutSerializer(data=self.data).is_valid(raise_exception=True)
        assert ex.exception.args[0] == {'non_field_errors': ['filled_out cannot be set to false']}

    def test_required_fields(self):
        """
        All fields are required after a profile is marked filled_out
        """
        keys = set(ProfileFilledOutSerializer.Meta.fields)
        self.assert_required_fields(keys, lambda profile: profile, lambda profile: profile)

    def test_work_history(self):
        """
        All fields are required after a profile is marked filled_out
        """
        # end date may be null for work history
        keys = set(EmploymentSerializer.Meta.fields) - {'end_date'}
        self.assert_required_fields(
            keys,
            lambda profile: profile['work_history'][0],
            lambda profile: profile['work_history'].child,
        )

    def test_work_history_end_date(self):
        """
        Make sure end_date can be set to null on filled out profiles
        """
        self.data['work_history'][0]['end_date'] = None
        self.data['image'] = self.profile.image
        # No exception should be raised by the next line
        ProfileFilledOutSerializer(data=self.data).is_valid(raise_exception=True)

    def test_education(self):
        """
        All fields are required after a profile is marked filled_out
        """
        keys = set(EducationSerializer.Meta.fields) - {'field_of_study'}
        self.assert_required_fields(
            keys,
            lambda profile: profile['education'][0],
            lambda profile: profile['education'].child,
        )
