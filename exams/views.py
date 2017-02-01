"""
Views for exams app
"""
from django.views.generic.base import RedirectView


class PearsonCallbackRedirectView(RedirectView):
    """
    Redirect from Pearson callbacks to dashboard
    """
    def get_redirect_url(self, status):  # pylint: disable=arguments-differ
        return "/dashboard?exam={status}".format(status=status)
