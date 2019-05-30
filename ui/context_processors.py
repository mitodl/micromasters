"""
context processors for ui
"""
from django.conf import settings

# pylint: disable=unused-argument


def api_keys(request):
    """
    Pass a `APIKEYS` dictionary into the template context, which holds
    IDs and secret keys for the various APIs used in this project.
    """
    return {
        "APIKEYS": {
            "GOOGLE": settings.GOOGLE_API_KEY,
            "GOOGLE_ANALYTICS": settings.GA_TRACKING_ID,
            "GOOGLE_ADWORDS": settings.ADWORDS_CONVERSION_ID,
            "GOOGLE_TAG_MANAGER": settings.GTM_CONTAINER_ID,
            "SMARTLOOK": settings.SL_TRACKING_ID,
        }
    }


def do_not_track(request):
    """
    Detect the "Do Not Track" HTTP header: http://donottrack.us
    """
    dnt = request.META.get("HTTP_DNT", None)
    # if dnt is "1", the user does not wish to be tracked
    # if dnt is "0", the user explicitly consents to be tracked
    # if dnt is not set, the user hasn't stated a preference
    return {
        "DO_NOT_TRACK": dnt == "1"
    }
