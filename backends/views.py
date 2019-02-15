"""Views related to social auth"""
from django.contrib.auth import logout
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from social_django.views import complete as social_complete
from social_django.utils import psa
from django_redis import get_redis_connection
from dashboard.api import CACHE_KEY_FAILURE_NUMS_BY_USER, FIELD_USER_ID_BASE_STR, CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE


@never_cache
@csrf_exempt
@psa('social:complete')
def complete(request, *args, **kwargs):
    """Override this method so we can force user to be logged out."""
    # This view overrides the behavior of the default 'complete' endpoint in order
    # to log out the user first. If user 1 is already logged in and user 2 is logged in on edX,
    # social_core can get confused on which User should get the SocialAuth object.
    if request.user.is_authenticated:
        key = "{}_state".format(request.backend.name)
        redirect_url = request.session.get("next")
        backend_state = request.session.get(key)
        logout(request)
        # logout will clear the session, this preserves the backend session state. We need to do
        # this so that this workflow will validate correctly (EdxOrgOAuth2.validate_state).
        # key is the same one used in EdxOrgAuth2.get_session_state().
        request.session[key] = backend_state
        request.session["next"] = redirect_url

    # Continue with social_core pipeline
    social_complete_rtn = social_complete(request, *args, **kwargs)

    # Update redis cache if user had invalid credentials
    if request.user.is_authenticated:
        con = get_redis_connection("redis")
        user_key = FIELD_USER_ID_BASE_STR.format(request.user.id)
        con.hdel(CACHE_KEY_FAILURE_NUMS_BY_USER, user_key)
        con.srem(CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE, request.user.id)

    return social_complete_rtn
