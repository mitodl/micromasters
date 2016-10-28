"""
Serializers for Django contrib models
"""
import logging
from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from profiles.api import get_social_username

log = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for users."""
    username = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    preferred_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "username", "email",
            "first_name", "last_name", "preferred_name",
        )

    def get_username(self, obj):  # pylint: disable=no-self-use
        """
        Look up the user's username on edX.
        We do *not* use the `user.username` field, because the Javascript
        doesn't need to know anything about that.
        """
        return get_social_username(obj)

    def get_first_name(self, obj):  # pylint: disable=no-self-use
        """
        Get first_name from user profile, if profile exists
        """
        try:
            return obj.profile.first_name
        except ObjectDoesNotExist:
            return None

    def get_last_name(self, obj):  # pylint: disable=no-self-use
        """
        Get last_name from user profile, if profile exists
        """
        try:
            return obj.profile.last_name
        except ObjectDoesNotExist:
            return None

    def get_preferred_name(self, obj):  # pylint: disable=no-self-use
        """
        Get preferred_name from user profile, if profile exists
        """
        try:
            return obj.profile.preferred_name
        except ObjectDoesNotExist:
            return None

    def to_representation(self, obj):
        """
        Serialize anonymous users as None
        """
        if obj.is_anonymous():
            return None
        return super().to_representation(obj)
