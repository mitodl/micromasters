"""
Page models for the CMS
"""
import json

from django.conf import settings
from django.db import models
from modelcluster.fields import ParentalKey
from wagtail.wagtailadmin.edit_handlers import FieldPanel, MultiFieldPanel
from wagtail.wagtailcore.models import Orderable, Page
from wagtail.wagtailimages.models import Image

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
        host = request.get_host().split(":")[0]

        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": host
        }

        context = super(HomePage, self).get_context(request)

        context['programs'] = Program.objects.filter(live=True)
        context["style_src"] = get_bundle_url(request, "style.js")
        context["public_src"] = get_bundle_url(request, "public.js")
        context["style_public_src"] = get_bundle_url(request, "style_public.js")
        context["authenticated"] = not request.user.is_anonymous()
        context["username"] = request.user.username
        context["js_settings_json"] = json.dumps(js_settings)
        context["title"] = self.title

        return context


# class ProgramPage(Page):
#     """
#     CMS page representing the department e.g. Biology
#     """
#     description = RichTextField(blank=True)
#     program = models.OneToOneField('courses.Program',
#                                    null=True,
#                                    on_delete=models.SET_NULL)

#     content_panels = Page.content_panels + [
#         FieldPanel('description', classname="full"),
#         FieldPanel('program'),
#         InlinePanel('FAQs', label='Frequently Asked Questions')
#     ]


class FrequentlyAskedQuestion(Orderable):
    page = ParentalKey(Program, related_name='FAQs')
    question = models.TextField()
    answer = models.TextField()

    panels = [
        MultiFieldPanel(
            [
                FieldPanel('question'),
                FieldPanel('answer')
            ],
            heading='Frequently Asked Questions',
            classname='collapsible'
        )
    ]
