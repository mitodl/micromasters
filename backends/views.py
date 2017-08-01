"""Views related to social auth"""
from django.contrib.auth import logout
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from social_django.views import complete as social_complete
from social_django.utils import psa


@never_cache
@csrf_exempt
@psa('social:complete')
def complete(request, *args, **kwargs):
    """Override this method so we can force user to be logged out."""
    # This view overrides the behavior of the default 'complete' endpoint in order
    # to log out the user first. If user 1 is already logged in and user 2 is logged in on edX,
    # social_core can get confused on which User should get the SocialAuth object.
    if request.user.is_authenticated():
        key = "{}_state".format(request.backend.name)
        backend_state = request.session.get(key)
        logout(request)
        # logout will clear the session, this preserves the backend session state. We need to do
        # this so that this workflow will validate correctly (EdxOrgOAuth2.validate_state).
        # key is the same one used in EdxOrgAuth2.get_session_state().
        request.session[key] = backend_state

    # Continue with social_core pipeline
    return social_complete(request, *args, **kwargs)
