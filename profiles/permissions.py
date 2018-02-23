"""
Permission classes for profiles
"""
from django.http import Http404
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)

from roles.roles import (
    Instructor,
    Staff,
)
from profiles.models import Profile
from dashboard.models import ProgramEnrollment


class CanEditIfOwner(BasePermission):
    """
    Only owner of a profile has permission to edit the profile.
    """

    def has_object_permission(self, request, view, obj):
        """
        Only allow editing for owner of the profile.
        """
        if request.method in SAFE_METHODS:
            return True

        return obj.user == request.user


class CanSeeIfNotPrivate(BasePermission):
    """
    Only owner of a profile can view and edit their profile.
    Verified micromaster users can view other profiles to limited view only if
    account_privacy of profile is set to public public_to_mm
    """

    def has_permission(self, request, view):
        """
        Implementation of the permission class.
        """
        profile = get_object_or_404(Profile, user__social_auth__uid=view.kwargs['user'])

        if request.user == profile.user:
            return True

        # If viewer is instructor or staff in the program, skip this check
        if not request.user.is_anonymous and request.user.role_set.filter(
                role__in=(Staff.ROLE_ID, Instructor.ROLE_ID),
                program__programenrollment__user__profile=profile,
        ).exists():
            return True

        # private profiles
        if profile.account_privacy == Profile.PRIVATE:
            raise Http404
        elif profile.account_privacy == Profile.PUBLIC_TO_MM:
            # anonymous user accessing profiles.
            if request.user.is_anonymous:
                raise Http404
            # requesting user must have enrollment in one of program where profile user is enroll.
            program_ids = ProgramEnrollment.objects.filter(user=profile.user).values_list('program__id', flat=True)
            if not ProgramEnrollment.objects.filter(user=request.user, program__id__in=program_ids).exists():
                raise Http404
        elif profile.account_privacy not in [Profile.PRIVATE, Profile.PUBLIC_TO_MM, Profile.PUBLIC]:
            raise Http404

        return True
