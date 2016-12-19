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
            "SMARTLOOK": settings.SL_TRACKING_ID,
        }
    }
