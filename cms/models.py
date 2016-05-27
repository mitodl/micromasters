"""
Page models for the CMS
"""
import json

from django.conf import settings
from django.db import models
from wagtail.wagtailimages.models import Image
from wagtail.wagtailcore.models import Page
from wagtail.wagtailcore.fields import RichTextField
from wagtail.wagtailadmin.edit_handlers import FieldPanel

from backends.edxorg import EdxOrgOAuth2
from micromasters.utils import webpack_dev_server_host
from courses.models import Program
from ui.views import get_bundle_url


class HomePage(Page):
    """
    CMS page representing the homepage.
    """
    title_background = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    content_panels = Page.content_panels + [
        FieldPanel('title_background')
    ]

    def get_context(self, request):
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": webpack_dev_server_host(request)
        }

        username = None
        if not request.user.is_anonymous():
            social_auths = request.user.social_auth.filter(provider=EdxOrgOAuth2.name)
            if social_auths.exists():
                username = social_auths.first().uid
        context = super(HomePage, self).get_context(request)

        context["programs"] = Program.objects.filter(live=True)
        context["style_src"] = get_bundle_url(request, "style.js")
        context["public_src"] = get_bundle_url(request, "public.js")
        context["style_public_src"] = get_bundle_url(request, "style_public.js")
        context["authenticated"] = not request.user.is_anonymous()
        context["username"] = username
        context["js_settings_json"] = json.dumps(js_settings)
        context["title"] = self.title

        return context


class ProgramPage(Page):
    """
    CMS page representing the department e.g. Biology
    """
    description = RichTextField(blank=True)
    program = models.OneToOneField('courses.Program', null=True, on_delete=models.SET_NULL)

    content_panels = Page.content_panels + [
        FieldPanel('description', classname="full"),
        FieldPanel('program'),
    ]
