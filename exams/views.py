from django.views.generic.base import RedirectView

class PearsonCallbackRedirectView(RedirectView):
    def get_redirect_url(self, status):
        return "/dashboard?exam={status}".format(status=status)
