"""
Page models for the CMS
"""
import json
import itertools

from django.conf import settings
from django.db import models
from modelcluster.fields import ParentalKey
from wagtail.wagtailimages.models import Image
from wagtail.wagtailcore.models import Page, Orderable
from wagtail.wagtailcore.fields import RichTextField
from wagtail.wagtailadmin.edit_handlers import FieldPanel, InlinePanel, MultiFieldPanel
from rolepermissions.verifications import has_role


from courses.models import Program
from micromasters.utils import webpack_dev_server_host
from profiles.api import get_social_username
from ui.views import get_bundle_url
from cms.api import get_course_enrollment_text, get_course_url
from roles.models import (
    Instructor,
    Staff,
)


def faculty_for_carousel(faculty):
    """formats faculty info for the carousel"""
    from cms.serializers import FacultySerializer
    return [FacultySerializer().to_representation(f) for f in faculty]


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
        programs = Program.objects.filter(live=True)
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": webpack_dev_server_host(request),
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

        return context


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

    content_panels = Page.content_panels + [
        FieldPanel('description', classname="full"),
        FieldPanel('program'),
        FieldPanel('thumbnail_image'),
        FieldPanel('external_program_page_url'),
        FieldPanel('program_home_page_url'),
        FieldPanel('program_contact_email'),
        FieldPanel('background_image'),
        FieldPanel('title_over_image'),
        FieldPanel('faculty_description'),
        InlinePanel('courses', label='Program Courses'),
        InlinePanel('faculty_members', label='Faculty'),
        InlinePanel('faqs', label='Frequently Asked Questions'),
    ]

    def get_context(self, request):
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": webpack_dev_server_host(request),
            "programId": self.program.id,
            "faculty": faculty_for_carousel(self.faculty_members.all()),
        }
        username = get_social_username(request.user)
        context = super(ProgramPage, self).get_context(request)

        courses_info = []
        for course in self.program.course_set.all().order_by(
                'position_in_program'
        ):
            courses_info.append((course, get_course_enrollment_text(course), get_course_url(course)))

        context["style_src"] = get_bundle_url(request, "style.js")
        context["public_src"] = get_bundle_url(request, "public.js")
        context["style_public_src"] = get_bundle_url(request, "style_public.js")
        context["authenticated"] = not request.user.is_anonymous()
        context["signup_dialog_src"] = get_bundle_url(request, "signup_dialog.js")
        context["faculty_carousel_src"] = get_bundle_url(request, "faculty_carousel.js")
        context["username"] = username
        context["js_settings_json"] = json.dumps(js_settings)
        context["title"] = self.title
        context["courses_info"] = courses_info

        return context

    @property
    def has_categorized_faq(self):
        """
        Returns True if the FAQ should be displayed with categories,
        False otherwise.
        """
        return any(faq.category for faq in self.faqs.all())

    @property
    def categorized_faqs(self):
        """
        Generator for pairs of (category, [faqs, in, category]).
        """
        query = self.faqs.all()
        generator = itertools.groupby(query, key=lambda faq: faq.category)
        # It would be great if we could just return this generator and be done,
        # but Django Templates doesn't play well with itertools.groupby:
        # see http://stackoverflow.com/questions/6906593/itertools-groupby-in-a-django-template
        # So unfortunately, we have to exhaust the generator and convert to a
        # list before returning.
        return [(grouper, list(values)) for grouper, values in generator]


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
    program_page = ParentalKey(ProgramPage, related_name='faqs')
    category = models.CharField(
        max_length=255, blank=True,
        help_text='Category for question. Questions with the same '
                  'category will be grouped together when displayed.')
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
