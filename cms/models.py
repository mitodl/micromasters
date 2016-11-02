"""
Page models for the CMS
"""
import json

from django.conf import settings
from django.db import models
from modelcluster.fields import ParentalKey
from raven.contrib.django.raven_compat.models import client as sentry
from rolepermissions.verifications import has_role
from wagtail.wagtailadmin.edit_handlers import (FieldPanel, InlinePanel,
                                                MultiFieldPanel)
from wagtail.wagtailcore.fields import RichTextField
from wagtail.wagtailcore.models import Orderable, Page
from wagtail.wagtailimages.models import Image

from courses.models import Program
from courses.serializers import CourseSerializer
from micromasters.serializers import serialize_maybe_user
from micromasters.utils import webpack_dev_server_host
from profiles.api import get_social_username
from roles.models import Instructor, Staff
from ui.views import get_bundle_url


def faculty_for_carousel(faculty):
    """formats faculty info for the carousel"""
    from cms.serializers import FacultySerializer
    return FacultySerializer(faculty, many=True).data


def courses_for_popover(courses):
    """formats course info for the popover"""
    return CourseSerializer(courses, many=True).data


class HomePage(Page):
    """
    CMS page representing the homepage.
    """
    content_panels = []
    subpage_types = ['ProgramPage']

    def get_context(self, request):
        programs = Program.objects.filter(live=True).order_by("id")
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": webpack_dev_server_host(request),
            "environment": settings.ENVIRONMENT,
            "sentry_dsn": sentry.get_public_dsn(),
            "release_version": settings.VERSION
        }

        username = get_social_username(request.user)
        context = super(HomePage, self).get_context(request)

        context["programs"] = programs
        context["style_src"] = get_bundle_url(request, "style.js")
        context["public_src"] = get_bundle_url(request, "public.js")
        context["style_public_src"] = get_bundle_url(request, "style_public.js")
        context["signup_dialog_src"] = get_bundle_url(request, "signup_dialog.js")
        context["authenticated"] = not request.user.is_anonymous()
        context["is_staff"] = has_role(request.user, [Staff.ROLE_ID, Instructor.ROLE_ID])
        context["username"] = username
        context["js_settings_json"] = json.dumps(js_settings)
        context["title"] = self.title
        context["sentry_client"] = get_bundle_url(request, "sentry_client.js")
        context["tracking_id"] = ""

        return context


class CategorizedFaqsPage(Page):
    """
    CMS page for categorized questions
    """
    content_panels = Page.content_panels + [
        InlinePanel('faqs', label='Frequently Asked Questions'),
    ]
    parent_page_types = ['FaqsPage']


class ProgramChildPage(Page):
    """
    Abstract page representing a child of ProgramPage
    """
    class Meta:
        abstract = True

    parent_page_types = ['ProgramPage']

    def parent_page(self):
        """ Get the parent ProgramPage"""
        return ProgramPage.objects.ancestor_of(self).first()

    def get_context(self, request):
        context = get_program_page_context(self.parent_page(), request)
        context['child_page'] = self
        context['active_tab'] = self.title
        return context


class FaqsPage(ProgramChildPage):
    """
    CMS page for questions
    """
    subpage_types = ['CategorizedFaqsPage']


class ProgramTabPage(ProgramChildPage):
    """
    CMS page for custom tabs on the program page
    """
    content = RichTextField(
        blank=True,
        help_text='The content of this tab on the program page'
    )
    content_panels = Page.content_panels + [
        FieldPanel('content')
    ]


class ProgramPage(Page):
    """
    CMS page representing the department e.g. Biology
    """
    description = RichTextField(
        blank=True,
        help_text='The description shown on the program page'
    )
    faculty_description = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text='The text to be shown as an introduction in the Faculty section'
    )
    program = models.OneToOneField(
        'courses.Program',
        null=True,
        on_delete=models.SET_NULL,
        help_text='The program for this page',
    )
    external_program_page_url = models.URLField(
        blank=True,
        null=True,
        help_text="If this field is set the program page link on the home page will go to this URL."
    )
    program_home_page_url = models.URLField(
        blank=True,
        null=True,
        help_text="A url for an external homepage. There will be a link to this url from the program page."
    )
    title_program_home_page_url = models.TextField(
        blank=True,
        help_text='The text for the link to an external homepage.'
    )
    program_contact_email = models.EmailField(
        blank=True,
        null=True,
        help_text="A contact email for the program."
    )
    background_image = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        help_text='The hero image on the program page'
    )
    title_over_image = RichTextField(blank=True)

    thumbnail_image = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        help_text=(
            'Thumbnail size must be at least 690x530 pixels. '
            'Thumbnails are cropped down to this size, preserving aspect ratio.'
        ),
    )
    subpage_types = ['FaqsPage', 'ProgramTabPage']
    content_panels = Page.content_panels + [
        FieldPanel('description', classname="full"),
        FieldPanel('program'),
        FieldPanel('thumbnail_image'),
        FieldPanel('external_program_page_url'),
        FieldPanel('program_home_page_url'),
        FieldPanel('title_program_home_page_url'),
        FieldPanel('program_contact_email'),
        FieldPanel('background_image'),
        FieldPanel('title_over_image'),
        FieldPanel('faculty_description'),
        InlinePanel('courses', label='Program Courses'),
        InlinePanel('faculty_members', label='Faculty'),
    ]

    def get_context(self, request):
        context = get_program_page_context(self, request)
        context['active_tab'] = 'about'
        return context


def get_program_page_context(programpage, request):
    """ Get context for the program page"""
    from cms.serializers import ProgramPageSerializer

    courses_query = (
        programpage.program.course_set.all()
    )
    js_settings = {
        "gaTrackingID": settings.GA_TRACKING_ID,
        "host": webpack_dev_server_host(request),
        "programId": programpage.program.id,
        "faculty": faculty_for_carousel(programpage.faculty_members.all()),
        "courses": courses_for_popover(courses_query),
        "environment": settings.ENVIRONMENT,
        "sentry_dsn": sentry.get_public_dsn(),
        "release_version": settings.VERSION,
        "user": serialize_maybe_user(request.user),
        "program": ProgramPageSerializer(programpage).data,
    }
    username = get_social_username(request.user)
    context = super(ProgramPage, programpage).get_context(request)

    context["zendesk_widget"] = get_bundle_url(request, "zendesk_widget.js")
    context["style_src"] = get_bundle_url(request, "style.js")
    context["public_src"] = get_bundle_url(request, "public.js")
    context["style_public_src"] = get_bundle_url(request, "style_public.js")
    context["authenticated"] = not request.user.is_anonymous()
    context["signup_dialog_src"] = get_bundle_url(request, "signup_dialog.js")
    context["faculty_carousel_src"] = get_bundle_url(request, "faculty_carousel.js")
    context["course_list_src"] = get_bundle_url(request, "course_list.js")
    context["username"] = username
    context["js_settings_json"] = json.dumps(js_settings)
    context["title"] = programpage.title
    context["courses"] = courses_query
    context["sentry_client"] = get_bundle_url(request, "sentry_client.js")
    context["tracking_id"] = programpage.program.ga_tracking_id

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


class ProgramFaculty(Orderable):
    """
    Faculty for the program
    """
    program_page = ParentalKey(ProgramPage, related_name='faculty_members')
    name = models.CharField(max_length=255, help_text='Full name of the faculty member')
    title = models.CharField(max_length=20, blank=True)
    short_bio = models.CharField(max_length=200, blank=True)
    image = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        help_text='Image for the faculty member. Should be 500px by 385px.'
    )
    content_panels = Page.content_panels + [
        MultiFieldPanel(
            [
                FieldPanel('name'),
                FieldPanel('title'),
                FieldPanel('short_bio'),
                FieldPanel('image'),
            ]
        )
    ]


class FrequentlyAskedQuestion(Orderable):
    """
    FAQs for the program
    """
    faqs_page = ParentalKey(CategorizedFaqsPage, related_name='faqs', null=True)
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
