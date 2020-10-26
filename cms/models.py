"""
Page models for the CMS
"""
import json

from django.conf import settings
from django.db import models
from django.utils.text import slugify
from modelcluster.fields import ParentalKey
from rolepermissions.checkers import has_role
from wagtail.admin.edit_handlers import (
    FieldPanel,
    InlinePanel,
    MultiFieldPanel,
    StreamFieldPanel,
)
from wagtail.core.blocks import RichTextBlock
from wagtail.core.fields import RichTextField, StreamField
from wagtail.core.models import Orderable, Page
from wagtail.contrib.table_block.blocks import TableBlock
from wagtail.images.models import Image

from courses.models import Program
from micromasters.serializers import serialize_maybe_user
from micromasters.utils import webpack_dev_server_host
from profiles.api import get_social_username
from roles.models import Instructor, Staff
from cms.util import get_coupon_code
from cms.blocks import CourseTeamBlock, ImageWithLinkBlock

common_table_options = {
    'startRows': 3,
    'startCols': 2,
    'renderer': 'html',
}


class HomePage(Page):
    """
    CMS page representing the homepage.
    """
    content_panels = []
    subpage_types = ['ProgramPage', 'BenefitsPage']

    def get_context(self, request, *args, **kwargs):
        programs = Program.objects.filter(live=True).select_related('programpage').order_by("id")
        benefits_page = BenefitsPage.objects.filter(live=True).first()
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": webpack_dev_server_host(request),
            "environment": settings.ENVIRONMENT,
            "sentry_dsn": settings.SENTRY_DSN,
            "release_version": settings.VERSION
        }

        username = get_social_username(request.user)
        context = super(HomePage, self).get_context(request)

        def get_program_page(program):
            """Return a None if ProgramPage does not exist, to avoid template errors"""
            try:
                return program.programpage
            except ProgramPage.DoesNotExist:
                return None

        program_pairs = [(program, get_program_page(program)) for program in programs]
        context["programs"] = program_pairs
        context["is_public"] = True
        context["has_zendesk_widget"] = True
        context["google_maps_api"] = False
        context["authenticated"] = not request.user.is_anonymous
        context["is_staff"] = has_role(request.user, [Staff.ROLE_ID, Instructor.ROLE_ID])
        context["username"] = username
        context["js_settings_json"] = json.dumps(js_settings)
        context["title"] = self.title
        context["ga_tracking_id"] = ""
        context["coupon_code"] = get_coupon_code(request)
        context["benefits_url"] = benefits_page.get_url() if benefits_page else ""

        return context


class BenefitsPage(Page):
    """
    CMS page for benefits
    """
    parent_page_types = ['HomePage']

    description = StreamField(
        [
            ('paragraph', RichTextBlock(blank=True)),
            ('image_with_link', ImageWithLinkBlock(help_text='Upload an image with a clickable link', blank=True))
        ],
        blank=True,
        help_text='The description shown on the benefits page')

    background_image = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        help_text='The hero image on the benefits page'
    )

    content = StreamField([
        ('rich_text', RichTextBlock()),
        ('image_with_link', ImageWithLinkBlock(help_text='Upload an image with a clickable link', blank=True)),
        ('benefits_table', TableBlock(table_options=common_table_options)),
    ], blank=True, help_text='The content of the benefits page')

    content_panels = Page.content_panels + [
        StreamFieldPanel('description', classname="full"),
        FieldPanel('background_image'),
        StreamFieldPanel('content'),
    ]

    def get_context(self, request, *args, **kwargs):
        js_settings = {
            "gaTrackingID": settings.GA_TRACKING_ID,
            "host": webpack_dev_server_host(request),
            "environment": settings.ENVIRONMENT,
            "sentry_dsn": settings.SENTRY_DSN,
            "release_version": settings.VERSION
        }

        username = get_social_username(request.user)
        context = super().get_context(request)

        context["is_public"] = True
        context["has_zendesk_widget"] = True
        context["google_maps_api"] = False
        context["authenticated"] = not request.user.is_anonymous
        context["is_staff"] = has_role(request.user, [Staff.ROLE_ID, Instructor.ROLE_ID])
        context["username"] = username
        context["js_settings_json"] = json.dumps(js_settings)
        context["title"] = self.title
        context["ga_tracking_id"] = ""

        return context


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

    def get_context(self, request, *args, **kwargs):
        context = get_program_page_context(self.parent_page(), request)
        context['child_page'] = self
        context['active_tab'] = self.title
        return context


class CategorizedFaqsPage(ProgramChildPage):
    """
    CMS page for categorized questions
    """
    content_panels = Page.content_panels + [
        InlinePanel('faqs', label='Frequently Asked Questions'),
    ]
    parent_page_types = ['FaqsPage']


class FaqsPage(ProgramChildPage):
    """
    CMS page for questions
    """
    subpage_types = ['CategorizedFaqsPage']


class ProgramTabPage(ProgramChildPage):
    """
    CMS page for custom tabs on the program page
    """
    content = StreamField([
        ('rich_text', RichTextBlock()),
        ('course_table', TableBlock(table_options=common_table_options)),
    ], blank=True, help_text='The content of this tab on the program page')

    content_panels = Page.content_panels + [
        StreamFieldPanel('content'),
    ]


class CourseTeamTabPage(ProgramChildPage):
    """
    CMS page for course team tab on the program page
    """
    address = RichTextField(
        blank=True,
        help_text='The address shown on the course team page')

    instructors_heading = models.CharField(
        max_length=255, default='Instructors',
        help_text='Heading to be shown for instructors on course team tab.'
    )
    administrators_heading = models.CharField(
        max_length=255, default='Course Administrator',
        help_text='Heading to be shown for course administrator on course team tab.'
    )
    contributors_heading = models.CharField(
        max_length=255, default='Course Contributors',
        help_text='Heading to be shown for course contributors on course team tab.'
    )
    teaching_assistants_heading = models.CharField(
        max_length=255, default='Course TAs',
        help_text='Heading to be shown for course TAs on course team tab.'
    )

    instructors = StreamField(
        [("instructors", CourseTeamBlock())], blank=True,
    )

    administrators = StreamField(
        [("administrator", CourseTeamBlock())], blank=True,
    )
    contributors = StreamField(
        [("contributor", CourseTeamBlock())], blank=True,
    )
    teaching_assistants = StreamField(
        [("TAs", CourseTeamBlock())], blank=True,
    )

    content_panels = Page.content_panels + [
        FieldPanel('address'),
        FieldPanel('instructors_heading'),
        StreamFieldPanel('instructors'),
        FieldPanel('administrators_heading'),
        StreamFieldPanel('administrators'),
        FieldPanel('contributors_heading'),
        StreamFieldPanel('contributors'),
        FieldPanel('teaching_assistants_heading'),
        StreamFieldPanel('teaching_assistants'),
    ]

    def get_context(self, request, *args, **kwargs):
        context = super(CourseTeamTabPage, self).get_context(request)

        # this will help us to disable instructors carousel on course team page
        context['course_team_tab_title'] = self.title
        return context


class ProgramPage(Page):
    """
    CMS page representing the department e.g. Biology
    """
    description = StreamField(
        [
            ('paragraph', RichTextBlock(blank=True)),
            ('image_with_link', ImageWithLinkBlock(help_text='Upload an image with a clickable link', blank=True))
        ],
        blank=True,
        help_text='The description shown on the program page')

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
    program_letter_logo = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        help_text=(
            'The logo that will appear at the top of the program congratulation letter.'
        ),
    )
    program_letter_header_text = RichTextField(
        blank=True,
        null=True,
        help_text="Header text that will appear next to the logo."
    )

    program_letter_footer = models.ForeignKey(
        Image,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        help_text=(
            'The logo that will appear at the bottom of the program congratulation letter.'
        ),
    )

    program_letter_text = RichTextField(
        blank=True,
        null=True,
        help_text="Text that will appear on the program congratulation letter."
    )

    program_letter_footer_text = RichTextField(
        blank=True,
        null=True,
        help_text="Footer text that will appear on the program congratulation letter."
    )

    program_subscribe_link = models.URLField(
        blank=True,
        null=True,
        help_text="A url for I'm interested button, if there is no course(s) available."
    )

    subpage_types = ['FaqsPage', 'CourseTeamTabPage', 'ProgramTabPage']
    content_panels = Page.content_panels + [
        StreamFieldPanel('description'),
        FieldPanel('program'),
        FieldPanel('thumbnail_image'),
        FieldPanel('program_home_page_url'),
        FieldPanel('title_program_home_page_url'),
        FieldPanel('program_contact_email'),
        FieldPanel('background_image'),
        FieldPanel('title_over_image'),
        FieldPanel('faculty_description'),
        FieldPanel('program_letter_logo'),
        FieldPanel('program_letter_header_text'),
        FieldPanel('program_letter_footer'),
        FieldPanel('program_letter_text'),
        FieldPanel('program_letter_footer_text'),
        FieldPanel('program_subscribe_link'),
        InlinePanel('courses', label='Program Courses'),
        InlinePanel('info_links', label='More Info Links'),
        InlinePanel('faculty_members', label='Faculty'),
        InlinePanel('semester_dates', label='Future Semester Dates'),
        InlinePanel('course_certificate_signatories', label='Course Certificate Signatories'),
        InlinePanel('program_certificate_signatories', label='Program Certificate Signatories'),
        InlinePanel('program_letter_signatories', label='Program Letter Signatories'),
    ]

    def get_context(self, request, *args, **kwargs):
        context = get_program_page_context(self, request)
        context['active_tab'] = 'about'
        child_pages = self.get_children()
        course_team_page = child_pages.type(CourseTeamTabPage).live().first()

        # the course team tab should always be second, first one is about tab
        context['child_pages'] = [course_team_page] + [page for page in child_pages.not_type(CourseTeamTabPage)]
        context['course_team_page'] = course_team_page

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
        "environment": settings.ENVIRONMENT,
        "sentry_dsn": settings.SENTRY_DSN,
        "release_version": settings.VERSION,
        "user": serialize_maybe_user(request.user),
        "program": ProgramPageSerializer(programpage).data,
    }
    username = get_social_username(request.user)
    context = super(ProgramPage, programpage).get_context(request)

    context["is_staff"] = has_role(request.user, [Staff.ROLE_ID, Instructor.ROLE_ID])
    context["is_public"] = True
    context["has_zendesk_widget"] = True
    context["google_maps_api"] = False
    context["authenticated"] = not request.user.is_anonymous
    context["username"] = username
    context["js_settings_json"] = json.dumps(js_settings)
    context["title"] = programpage.title
    context["courses"] = courses_query
    context["ga_tracking_id"] = programpage.program.ga_tracking_id

    return context


class InfoLinks(Orderable):
    """
    Links listed under 'More Info' for the program
    """
    program_page = ParentalKey(ProgramPage, related_name='info_links')
    url = models.URLField(
        blank=True,
        null=True,
        help_text="A url for an external page. There will be a link to this url from the program page."
    )
    title_url = models.TextField(
        blank=True,
        help_text='The text for the link to an external homepage.'
    )

    panels = [
        MultiFieldPanel(
            [
                FieldPanel('url'),
                FieldPanel('title_url')
            ]
        )
    ]


class SemesterDate(Orderable):
    """
    Dates for future start dates of semesters
    """
    program_page = ParentalKey(ProgramPage, related_name='semester_dates')
    semester_name = models.CharField(
        max_length=50,
        help_text='Name for the semester. For example: "Fall" or "Fall 2018"'
    )
    start_date = models.DateField()

    panels = [
        MultiFieldPanel(
            [
                FieldPanel('semester_name'),
                FieldPanel('start_date')
            ]
        )
    ]


class ProgramCourse(Orderable):
    """
    Courses listed for the program
    """
    program_page = ParentalKey(ProgramPage, related_name='courses')
    course = models.OneToOneField(
        'courses.Course',
        null=True,
        on_delete=models.SET_NULL,
        help_text='The course for this ProgramCourse',
    )
    title = models.CharField(max_length=255, default='')
    description = RichTextField(blank=True, null=True)
    panels = [
        MultiFieldPanel(
            [
                FieldPanel('course'),
                FieldPanel('title'),
                FieldPanel('description'),
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
    panels = [
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
    slug = models.SlugField(unique=True, default=None, blank=True)

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        if not self.slug:
            max_length = FrequentlyAskedQuestion._meta.get_field('slug').max_length
            slug = orig_slug = slugify(self.question)[:max_length]
            slug_is_unique = not FrequentlyAskedQuestion.objects.filter(slug=orig_slug).exists()
            count = 1
            while not slug_is_unique:
                slug = "{orig}-{count}".format(
                    orig=orig_slug[:max_length - len(str(count)) - 1],
                    count=count)
                slug_is_unique = not FrequentlyAskedQuestion.objects.filter(slug=slug).exists()
                count += 1
            self.slug = slug
        super(FrequentlyAskedQuestion, self).save(*args, **kwargs)

    panels = [
        MultiFieldPanel(
            [
                FieldPanel('question'),
                FieldPanel('answer'),
                FieldPanel('slug')
            ],
            heading='Frequently Asked Questions',
            classname='collapsible'
        )
    ]


class CourseCertificateSignatories(Orderable):
    """
    Signatories to appear on MicroMasters-generated course certificates
    """
    program_page = ParentalKey(ProgramPage, related_name='course_certificate_signatories')
    course = models.ForeignKey(
        'courses.Course',
        related_name='signatories',
        help_text='The course for this certificate.',
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255, help_text='Full name of the signatory')
    title_line_1 = models.TextField(help_text='Signatory title (e.g.: Associate Professor)')
    title_line_2 = models.TextField(blank=True, help_text='Signatory title (optional second line)')
    organization = models.CharField(
        max_length=255,
        default="Massachusetts Institute of Technology",
        help_text='Name of the organization where the signatory holds the given title.'
    )
    signature_image = models.ForeignKey(
        Image,
        related_name='+',
        help_text='Signature image.',
        on_delete=models.CASCADE,
    )

    panels = [
        MultiFieldPanel(
            [
                FieldPanel('name'),
                FieldPanel('title_line_1'),
                FieldPanel('title_line_2'),
                FieldPanel('organization'),
                FieldPanel('signature_image'),
            ]
        )
    ]


class ProgramCertificateSignatories(Orderable):
    """
    Signatories to appear on MicroMasters Program Certificates
    """
    program_page = ParentalKey(ProgramPage, related_name='program_certificate_signatories')
    name = models.CharField(max_length=255, help_text='Full name of the signatory')
    title_line_1 = models.TextField(help_text='Signatory title (e.g.: Associate Professor)')
    title_line_2 = models.TextField(blank=True, help_text='Signatory title (optional second line)')
    organization = models.CharField(
        max_length=255,
        default="Massachusetts Institute of Technology",
        help_text='Name of the organization where the signatory holds the given title.'
    )
    signature_image = models.ForeignKey(
        Image,
        related_name='+',
        help_text='Signature image.',
        on_delete=models.CASCADE,
    )

    panels = [
        MultiFieldPanel(
            [
                FieldPanel('name'),
                FieldPanel('title_line_1'),
                FieldPanel('title_line_2'),
                FieldPanel('organization'),
                FieldPanel('signature_image'),
            ]
        )
    ]


class ProgramLetterSignatory(Orderable):
    """
    Signatories to appear on MicroMasters congratulation letter
    """
    program_page = ParentalKey(ProgramPage, related_name='program_letter_signatories')
    name = models.CharField(max_length=255, help_text='Full name of the signatory')
    title_line_1 = models.TextField(help_text='Signatory title (e.g.: Associate Professor)')
    title_line_2 = models.TextField(blank=True, help_text='Signatory title (optional second line)')

    signature_image = models.ForeignKey(
        Image,
        related_name='+',
        help_text='Signature image.',
        on_delete=models.CASCADE,
    )

    panels = [
        MultiFieldPanel(
            [
                FieldPanel('name'),
                FieldPanel('title_line_1'),
                FieldPanel('title_line_2'),
                FieldPanel('signature_image'),
            ]
        )
    ]
