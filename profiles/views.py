"""Views for courses"""
from rest_framework.mixins import (
    RetrieveModelMixin,
    UpdateModelMixin,
)
from rest_framework.viewsets import GenericViewSet

from roles.roles import (
    Instructor,
    Staff,
)
from profiles.models import Profile
from profiles.serializers import (
    ProfileSerializer,
    ProfileFilledOutSerializer,
    ProfileLimitedSerializer,
)
from profiles.permissions import (
    CanEditIfOwner,
    CanSeeIfNotPrivate,
)


class ProfileViewSet(RetrieveModelMixin, UpdateModelMixin, GenericViewSet):
    """API for the Program collection"""
    # pylint: disable=too-many-return-statements

    permission_classes = (CanEditIfOwner, CanSeeIfNotPrivate, )
    lookup_field = 'user__social_auth__uid'
    lookup_url_kwarg = 'user'
    lookup_value_regex = r'[-\w.]+'
    queryset = Profile.objects.all()

    # possible serializers
    serializer_class_staff = ProfileSerializer
    serializer_class_owner = ProfileSerializer
    serializer_class_filled_out = ProfileFilledOutSerializer
    serializer_class_limited = ProfileLimitedSerializer

    def get_serializer_class(self):
        """
        Different parts of a user profile are visible in different conditions
        """
        profile = self.get_object()

        # Owner of the profile
        if self.request.user == profile.user:
            if profile.filled_out or self.request.data.get('filled_out'):
                return self.serializer_class_filled_out
            else:
                return self.serializer_class_owner
        # Staff or instructor is looking at profile
        elif not self.request.user.is_anonymous and self.request.user.role_set.filter(
                role__in=(Staff.ROLE_ID, Instructor.ROLE_ID),
                program__programenrollment__user__profile=profile,
        ).exists():
            return self.serializer_class_staff
        # Profile is public
        elif profile.account_privacy == Profile.PUBLIC:
            return self.serializer_class_limited
        # Profile is public to mm verified users only
        elif profile.account_privacy == Profile.PUBLIC_TO_MM:
            return self.serializer_class_limited
        # this should never happen, but just in case
        return self.serializer_class_limited
