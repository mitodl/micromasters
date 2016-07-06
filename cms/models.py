"""
Page models for the CMS
"""
import json

from django.conf import settings
from django.db import models
from modelcluster.fields import ParentalKey
from wagtail.wagtailimages.models import Image
from wagtail.wagtailcore.models import Page, Orderable
from wagtail.wagtailcore.fields import RichTextField
from wagtail.wagtailadmin.edit_handlers import FieldPanel, InlinePanel, MultiFieldPanel


from courses.models import Program
from micromasters.utils import webpack_dev_server_host
from profiles.api import get_social_username
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

        username = get_social_username(request.user)
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
    external_program_page_url = models.URLField(
        blank=True,
        null=True,
        help_text="Use this field to directly link an external web page for this program."
    )
    background_image = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )
    contact_us = RichTextField(blank=True)
    title_over_image = RichTextField(blank=True)

    thumbnail_image = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )

    content_panels = Page.content_panels + [
        FieldPanel('description', classname="full"),
        FieldPanel('program'),
        FieldPanel('thumbnail_image'),
        FieldPanel('external_program_page_url'),
        FieldPanel('background_image'),
        FieldPanel('contact_us'),
        FieldPanel('title_over_image'),
        InlinePanel('courses', label='Program Courses'),
        InlinePanel('faqs', label='Frequently Asked Questions'),
    ]

    def get_context(self, request):
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": webpack_dev_server_host(request)
        }
        username = get_social_username(request.user)
        context = super(ProgramPage, self).get_context(request)

        context["style_src"] = get_bundle_url(request, "style.js")
        context["public_src"] = get_bundle_url(request, "public.js")
        context["style_public_src"] = get_bundle_url(request, "style_public.js")
        context["authenticated"] = not request.user.is_anonymous()
        context["username"] = username
        context["js_settings_json"] = json.dumps(js_settings)
        context["title"] = self.title

        return context


class ProgramCourse(Orderable):
    """
    Courses listed for the program
    """
    program_page = ParentalKey(ProgramPage, related_name='courses')
    title = models.CharField(max_length=255, default='')
    description = RichTextField(blank=True, null=True)
    content_panels = Page.content_panels + [
        MultiFieldPanel(
            [
                FieldPanel('title'),
            ]
        )
    ]


class FrequentlyAskedQuestion(Orderable):
    """
    FAQs for the program
    """
    program_page = ParentalKey(ProgramPage, related_name='faqs')
    question = models.TextField()
    answer = RichTextField()

    content_panels = [
        MultiFieldPanel(
            [
                FieldPanel('question'),
                FieldPanel('answer')
            ],
            heading='Frequently Asked Questions',
            classname='collapsible'
        )
    ]
