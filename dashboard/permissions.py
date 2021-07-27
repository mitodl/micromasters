"""
Permission classes for the dashboard
"""
from django.contrib.auth.models import User
from django.http import Http404
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import BasePermission

from roles.roles import (
    Instructor,
    Staff,
)


class CanReadIfStaffOrSelf(BasePermission):
    """
    Only staff on a program the learner is enrolled in can
    see their dashboard. Learners can view their own dashboard.
    """

    def has_permission(self, request, view):
        if request.user.is_anonymous:
            raise Http404

        user = get_object_or_404(
            User,
            username=view.kwargs['username'],
        )

        # if the user is looking for their own profile, they're good
        if request.user == user:
            return True

        # if the user is looking for someone enrolled in a program they
        # are staff on, they're good
        if request.user.role_set.filter(
                role__in=(Staff.ROLE_ID, Instructor.ROLE_ID),
                program__programenrollment__user=user,
        ).exists():
            return True
        else:
            raise Http404
