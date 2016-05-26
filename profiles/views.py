"""Views for courses"""
from rest_framework.mixins import (
    RetrieveModelMixin,
    UpdateModelMixin,
)
from rest_framework.viewsets import GenericViewSet

from profiles.models import Profile
from profiles.serializers import (
    ProfileSerializer,
    ProfileLimitedSerializer,
    ProfilePrivateSerializer,
)
from profiles.permissions import CanEditIfOwner


class ProfileViewSet(RetrieveModelMixin, UpdateModelMixin, GenericViewSet):
    """API for the Program collection"""
    # pylint: disable=too-many-return-statements

    permission_classes = (CanEditIfOwner, )
    lookup_field = 'user__social_auth__uid'
    lookup_url_kwarg = 'user'
    queryset = Profile.objects.all()

    # possible serializers
    serializer_class_owner = ProfileSerializer
    serializer_class_limited = ProfileLimitedSerializer
    serializer_class_private = ProfilePrivateSerializer

    def get_serializer_class(self):
        """
        Different parts of a user profile are visible in different conditions
        """
        profile = self.get_object()

        # Case #1: Owner of the profile
        if self.request.user == profile.user:
            return self.serializer_class_owner
        # Case #2: Profile is private
        elif profile.account_privacy == Profile.PRIVATE:
            return self.serializer_class_private
        # Case #3: Profile is public
        elif profile.account_privacy == Profile.PUBLIC:
            return self.serializer_class_limited
        # Case #4: Profile is public to mm verified users only
        elif profile.account_privacy == Profile.PUBLIC_TO_MM:
            # Case #3: anonymous user
            if self.request.user.is_anonymous():
                # the profile at this point is not public so the anonymous users can see only basic info
                return self.serializer_class_private
            # Case #4: the user is not a micromaster verified user
            elif not self.request.user.profile.verified_micromaster_user:
                return self.serializer_class_private
            return self.serializer_class_limited
        # Case #5: this should never happen, but just in case
        return self.serializer_class_private
