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
    if request.user.is_authenticated():
        key = "{}_state".format(request.backend.name)
        backend_state = request.session.get(key)
        logout(request)
        request.session[key] = backend_state

    return social_complete(request, *args, **kwargs)
