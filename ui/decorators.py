"""
Decorators for views
"""
from functools import wraps

from django.conf import settings
from django.db.models import Exists, OuterRef
from django.shortcuts import redirect
from django.urls import reverse

from backends.constants import BACKEND_MITX_ONLINE
from courses.models import Program, CourseRun
from ui.url_utils import (
    PROFILE_URL,
)


def require_mandatory_urls(func):
    """
    If user profile does not have terms of service, redirect to terms of service
    If user profile is not filled out, redirect to profile
    """
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        """
        Wrapper for check mandatory parts of the app

        Args:
            request (django.http.request.HttpRequest): A request
        """
        if not request.user.is_anonymous:
            profile = request.user.profile
            if not request.path.startswith(PROFILE_URL) and not profile.filled_out:
                return redirect(PROFILE_URL)

        return func(request, *args, **kwargs)
    return wrapper


def require_mitxonline_auth(func):
    """
    If user is in a program that has at least one mitxonline course run.
    """
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        """
        Wrapper for checking mitxonline auth status

        Args:
            request (django.http.request.HttpRequest): A request
        """
        user = request.user

        if (
            settings.FEATURES.get("MITXONLINE_LOGIN", False)
            and user.is_authenticated
            and Program.objects.annotate(
                has_mitxonline_courserun=Exists(CourseRun.objects.filter(
                    course__program=OuterRef('pk'),
                    courseware_backend=BACKEND_MITX_ONLINE
                ))
            ).filter(
                has_mitxonline_courserun=True,
                programenrollment__user=user
            ).exists()
            and not user.social_auth.filter(provider=BACKEND_MITX_ONLINE).exists()
        ):
            return redirect(reverse("mitx-online-required"))

        return func(request, *args, **kwargs)

    return wrapper
