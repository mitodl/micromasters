"""
Serializers for Django contrib models
"""
import logging
from rest_framework import serializers
from django.contrib.auth.models import User, AnonymousUser
from django.core.exceptions import ObjectDoesNotExist
from rolepermissions.verifications import has_role
from roles.models import Instructor, Staff
from backends.edxorg import EdxOrgOAuth2

log = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for users."""
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    preferred_name = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()
    social_username = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "username", "email", "social_username",
            "first_name", "last_name", "preferred_name",
            "is_staff",
        )

    def get_first_name(self, obj):  # pylint: disable=no-self-use
        "Get first_name from user profile"
        if obj.profile:
            return obj.profile.first_name
        return None

    def get_last_name(self, obj):  # pylint: disable=no-self-use
        "Get last_name from user profile"
        if obj.profile:
            return obj.profile.last_name
        return None

    def get_preferred_name(self, obj):  # pylint: disable=no-self-use
        "Get preferred_name from user profile"
        if obj.profile:
            return obj.profile.preferred_name
        return None

    def get_is_staff(self, obj):  # pylint: disable=no-self-use
        """
        Look up whether the user is staff or not
        """
        return has_role(obj, [Staff.ROLE_ID, Instructor.ROLE_ID])

    def get_social_username(self, obj):  # pylint: disable=no-self-use
        """
        Look up the user's username on edX
        """
        try:
            return obj.social_auth.get(provider=EdxOrgOAuth2.name).uid
        except ObjectDoesNotExist:
            return None
        except Exception as ex:  # pylint: disable=broad-except
            log.error("Unexpected error retrieving social auth username: %s", ex)
            return None

    def to_representation(self, obj):
        """
        Serialize anonymous users as None
        """
        if obj.is_anonymous():
            return None
        return super().to_representation(obj)

    def to_internal_value(self, data):
        if not data:
            return AnonymousUser()
        return super().to_internal_value(data)
