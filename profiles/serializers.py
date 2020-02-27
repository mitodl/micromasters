"""
Serializers for user profiles
"""
from django.db import transaction
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import (
    IntegerField,
    ModelSerializer,
    SerializerMethodField,
)

from profiles.api import get_social_username
from profiles.models import (
    Education,
    Employment,
    Profile,
)


def update_work_history(work_history_list, profile_id):
    """
    Update employment history for given profile id.

    Args:
        work_history_list (list): List of work history dicts.
        profile_id (int): User profile id.
    """
    saved_work_history_ids = set()
    for work_history in work_history_list:
        work_history_id = work_history.get("id")
        work_history_instance = None
        if work_history_id:
            try:
                work_history_instance = Employment.objects.get(
                    profile_id=profile_id, id=work_history_id
                )
            except Employment.DoesNotExist:
                raise ValidationError("Work history {} does not exist".format(work_history_id))

        work_history_serializer = EmploymentSerializer(instance=work_history_instance, data=work_history)
        work_history_serializer.is_valid(raise_exception=True)
        work_history_serializer.save(profile_id=profile_id)
        saved_work_history_ids.add(work_history_serializer.instance.id)

    Employment.objects.filter(profile_id=profile_id).exclude(id__in=saved_work_history_ids).delete()


def update_education(education_list, profile_id):
    """
    Update education for given profile id.

    Args:
        education_list (list): List of education dicts.
        profile_id (int): User profile id.
    """
    saved_education_ids = set()
    for education in education_list:
        education_id = education.get("id")
        if education_id is not None:
            try:
                education_instance = Education.objects.get(profile_id=profile_id, id=education_id)
            except Education.DoesNotExist:
                raise ValidationError("Education {} does not exist".format(education_id))
        else:
            education_instance = None
        education_serializer = EducationSerializer(instance=education_instance, data=education)
        education_serializer.is_valid(raise_exception=True)
        education_serializer.save(profile_id=profile_id)
        saved_education_ids.add(education_serializer.instance.id)

    Education.objects.filter(profile_id=profile_id).exclude(id__in=saved_education_ids).delete()


class EmploymentSerializer(ModelSerializer):
    """Serializer for Employment objects"""
    id = IntegerField(required=False)  # override the read_only flag so we can edit it

    class Meta:
        model = Employment
        fields = (
            'id',
            'city',
            'state_or_territory',
            'country',
            'company_name',
            'position',
            'industry',
            'end_date',
            'start_date'
        )


def set_fields_to_required(serializer, ignore_fields=None):
    """
    Iterate through fields in serializer and set all to required except ignore_fields

    Args:
        serializer (rest_framework.serializers.Serializer):
            A serializer
        ignore_fields (list of str):
            If not none, a list of field names to skip
    Returns:
        None
    """
    if ignore_fields is None:
        ignore_fields = []
    for field in serializer.fields.values():
        if field.field_name not in ignore_fields:
            field.required = True
            field.allow_null = False
            field.allow_blank = False


class EmploymentFilledOutSerializer(EmploymentSerializer):
    """Serializer for Employment objects in filled out Profiles"""

    def __init__(self, *args, **kwargs):
        """
        Update serializer_field_mapping to use fields setting required=True
        """
        super().__init__(*args, **kwargs)
        set_fields_to_required(self, ['end_date'])


class EducationSerializer(ModelSerializer):
    """Serializer for Education objects"""
    id = IntegerField(required=False)  # override the read_only flag so we can edit it

    class Meta:
        model = Education
        fields = (
            'id',
            'degree_name',
            'graduation_date',
            'field_of_study',
            'online_degree',
            'school_name',
            'school_city',
            'school_state_or_territory',
            'school_country')


class EducationFilledOutSerializer(EducationSerializer):
    """Serializer for Education objects in filled out Profiles"""

    def __init__(self, *args, **kwargs):
        """
        Update serializer_field_mapping to use fields setting required=True
        """
        super().__init__(*args, **kwargs)
        set_fields_to_required(self, ['field_of_study'])


class ProfileBaseSerializer(ModelSerializer):
    """Base class for all the profile serializers"""

    username = SerializerMethodField()
    work_history = EmploymentSerializer(many=True)
    education = EducationSerializer(many=True)

    def get_username(self, obj):
        """Getter for the username field"""
        return get_social_username(obj.user)


class ProfileSerializer(ProfileBaseSerializer):
    """Serializer for Profile objects"""
    def update(self, instance, validated_data):
        with transaction.atomic():
            for attr, value in validated_data.items():
                if attr in ('work_history', 'education'):
                    continue
                else:
                    setattr(instance, attr, value)

            update_image = 'image' in validated_data
            instance.save(update_image=update_image)
            if 'work_history' in self.initial_data:
                update_work_history(validated_data['work_history'], instance.id)

            if 'education' in self.initial_data:
                update_education(validated_data['education'], instance.id)
            return instance

    class Meta:
        model = Profile
        fields = (
            'username',
            'filled_out',
            'agreed_to_terms_of_service',
            'account_privacy',
            'email_optin',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'preferred_name',
            'country',
            'state_or_territory',
            'city',
            'address',
            'postal_code',
            'birth_country',
            'nationality',
            'date_of_birth',
            'preferred_language',
            'gender',
            'pretty_printed_student_id',
            'student_id',
            'work_history',
            'edx_level_of_education',
            'education',
            'image',
            'image_small',
            'image_medium',
            'about_me',
            'romanized_first_name',
            'romanized_last_name',
            'phone_number',
        )
        read_only_fields = (
            'edx_level_of_education',
            'agreed_to_terms_of_service',
            'image_small',
            'image_medium',
            'student_id',
        )


class ProfileLimitedSerializer(ProfileBaseSerializer):
    """
    Serializer for Profile objects, limited to fields that other users are
    allowed to see if a profile is marked public.
    """

    class Meta:
        model = Profile
        fields = (
            'username',
            'account_privacy',
            'first_name',
            'last_name',
            'full_name',
            'preferred_name',
            'country',
            'state_or_territory',
            'city',
            'birth_country',
            'preferred_language',
            'gender',
            'work_history',
            'edx_level_of_education',
            'education',
            'about_me',
            'image_medium',
            'romanized_first_name',
            'romanized_last_name'
        )
        read_only_fields = (
            'edx_level_of_education',
            'agreed_to_terms_of_service',
            'image_small',
            'image_medium',
        )


class ProfileFilledOutSerializer(ProfileSerializer):
    """Serializer for Profile objects which require filled_out = True"""
    work_history = EmploymentFilledOutSerializer(many=True)
    education = EducationFilledOutSerializer(many=True)

    def __init__(self, *args, **kwargs):
        """
        Update serializer_field_mapping to use fields setting required=True
        """
        super().__init__(*args, **kwargs)
        ignore_fields = (
            'about_me',
            'romanized_first_name',
            'romanized_last_name',
            'postal_code',
        )
        set_fields_to_required(self, ignore_fields=ignore_fields)

    def validate(self, attrs):
        """
        Assert that filled_out can't be turned off and that agreed_to_terms_of_service is true
        """
        if 'filled_out' in attrs and not attrs['filled_out']:
            raise ValidationError("filled_out cannot be set to false")

        if 'agreed_to_terms_of_service' in attrs and not attrs['agreed_to_terms_of_service']:
            raise ValidationError("agreed_to_terms_of_service cannot be set to false")

        # Postal code is only required in United States and Canada
        country = attrs.get("country", "")
        postal_code = attrs.get("postal_code", "")
        if country in ("US", "CA") and not postal_code:
            raise ValidationError("postal_code may not be blank")

        return super().validate(attrs)


class ProfileImageSerializer(ModelSerializer):
    """Serializer for Profile objects for the Learners In Program card"""
    username = SerializerMethodField()

    def get_username(self, obj):
        """Getter for the username field"""
        return get_social_username(obj.user)

    class Meta:
        model = Profile
        fields = (
            'username',
            'image_small',
        )
