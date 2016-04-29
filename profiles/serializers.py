"""
Serializers for user profiles
"""
from django.db import transaction
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import ModelSerializer, SerializerMethodField, IntegerField

from profiles.models import Profile, Education


class EducationSerializer(ModelSerializer):
    id = IntegerField(required=False)  # override the read_only flag so we can edit it

    class Meta:
        model = Education
        fields = ('id', 'degree_name', 'graduation_date', 'subject', 'school_name', 'school_city', 'school_country')


class ProfileSerializer(ModelSerializer):
    """Serializer for Profile objects"""
    pretty_printed_student_id = SerializerMethodField()

    education = EducationSerializer(many=True)

    def get_pretty_printed_student_id(self, obj):
        """helper method for the SerializerMethodField"""
        # pylint: disable=no-self-use
        return obj.pretty_printed_student_id

    def update(self, instance, validated_data):
        with transaction.atomic():
            for attr, value in validated_data.items():
                if attr == 'education':
                    continue
                else:
                    setattr(instance, attr, value)
            instance.save()

            profile_id = instance.id
            if 'education' in validated_data:
                saved_education_ids = set()
                for education in validated_data['education']:
                    education_id = education.get("id")
                    if education_id is not None:
                        try:
                            education_instance = Education.objects.get(profile_id=instance.id, id=education_id)
                        except Education.DoesNotExist:
                            raise ValidationError("Education {} does not exist".format(education_id))
                    else:
                        education_instance = None
                    education_serializer = EducationSerializer(instance=education_instance, data=education)
                    education_serializer.is_valid(raise_exception=True)
                    education_serializer.save(profile_id=profile_id)
                    saved_education_ids.add(education_serializer.instance.id)

                Education.objects.filter(profile_id=instance.id).exclude(id__in=saved_education_ids).delete()

            return instance



    class Meta:  # pylint: disable=missing-docstring
        model = Profile
        fields = (
            'filled_out',
b            'account_privacy',
            'email_optin',
            'first_name',
            'last_name',
            'preferred_name',
            'country',
            'state_or_territory',
            'city',
            'birth_country',
            'birth_state_or_territory',
            'birth_city',
            'has_profile_image',
            'profile_url_full',
            'profile_url_large',
            'profile_url_medium',
            'profile_url_small',
            'date_of_birth',
            'preferred_language',
            'gender',
            'pretty_printed_student_id',
            'edx_level_of_education',
            'education'
        )
        read_only_fields = (
            'filled_out',
        )


class ProfileLimitedSerializer(ModelSerializer):
    """
    Serializer for Profile objects, limited to fields that other users are
    allowed to see if a profile is marked public.
    """
    class Meta:  # pylint: disable=missing-docstring
        model = Profile
        fields = (
            'preferred_name',
            'account_privacy',
            'country',
            'state_or_territory',
            'city',
            'has_profile_image',
            'profile_url_full',
            'profile_url_large',
            'profile_url_medium',
            'profile_url_small',
        )


class ProfilePrivateSerializer(ModelSerializer):
    """
    Serializer for Profile objects, limited to fields that other users are
    allowed to see if a profile is marked private.
    """
    class Meta:  # pylint: disable=missing-docstring
        model = Profile
        fields = (
            'account_privacy',
            'has_profile_image',
            'profile_url_full',
            'profile_url_large',
            'profile_url_medium',
            'profile_url_small',
        )
