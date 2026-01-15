"""Factories for making test data"""
import uuid

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyText
from wagtail.images.models import Image
from wagtail.images.tests.utils import get_test_image_file

from cms.models import (CourseCertificateSignatories, HomePage, InfoLinks,
                        ProgramCertificateSignatories, ProgramCourse,
                        ProgramFaculty, ProgramLetterSignatory, ProgramPage,
                        SemesterDate)
from courses.factories import CourseFactory, ProgramFactory


class ImageFactory(DjangoModelFactory):
    """Factory for Wagtail images"""
    class Meta:
        model = Image

    title = factory.Faker('file_name', extension="jpg")
    width = factory.Faker('pyint')
    height = factory.Faker('pyint')

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        name = f"{uuid.uuid4().hex}.jpg"
        image_file = get_test_image_file(filename=name)

        # Ensure model receives a valid image file with dimensions set
        kwargs.setdefault("file", image_file)
        kwargs.setdefault("width", image_file.width)
        kwargs.setdefault("height", image_file.height)
        kwargs.setdefault("title", name)

        return model_class.objects.create(*args, **kwargs)


class ProgramPageFactory(DjangoModelFactory):
    """Factory for ProgramPage"""
    class Meta:
        model = ProgramPage

    title = factory.Faker('sentence', nb_words=4)
    # StreamField expects a list/dict structure; use empty stream by default
    description = []
    program = factory.SubFactory(ProgramFactory)
    faculty_description = factory.Faker('paragraph')
    program_contact_email = factory.Faker('email')
    title_over_image = factory.Faker('sentence')
    thumbnail_image = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        home_page = HomePage.objects.first()
        # Ensure StreamField description is properly structured when a plain string is provided
        description = kwargs.get("description")
        if isinstance(description, str):
            kwargs["description"] = [("paragraph", description)]
        page = model_class(*args, **kwargs)
        home_page.add_child(instance=page)
        page.save_revision().publish()
        return page

    class Params:
        has_thumbnail = factory.Trait(thumbnail_image=factory.SubFactory(ImageFactory))


class ProgramCourseFactory(DjangoModelFactory):
    """Factory for ProgramCourse"""
    class Meta:
        model = ProgramCourse

    title = factory.Faker('sentence', nb_words=4)
    program_page = factory.SubFactory(ProgramPageFactory)
    course = factory.SubFactory(CourseFactory)
    description = factory.Faker('sentence', nb_words=4)


class FacultyFactory(DjangoModelFactory):
    """Factory for program faculty"""
    class Meta:
        model = ProgramFaculty

    name = factory.Faker('name')
    title = "Ph.D"
    short_bio = factory.Faker('text')

    program_page = factory.SubFactory(ProgramPageFactory)
    image = factory.SubFactory(ImageFactory)


class InfoLinksFactory(DjangoModelFactory):
    """Factory for more info links"""
    class Meta:
        model = InfoLinks

    url = factory.Faker('url')
    title_url = factory.Faker('text')
    program_page = factory.SubFactory(ProgramPageFactory)


class SemesterDateFactory(DjangoModelFactory):
    """Factory for semester dates"""
    class Meta:
        model = SemesterDate

    program_page = factory.SubFactory(ProgramPageFactory)
    semester_name = FuzzyText(prefix='Semester ')
    start_date = factory.Faker('date_time_this_month')


class CourseCertificateSignatoriesFactory(DjangoModelFactory):
    """Factory for CourseCertificateSignatories"""

    class Meta:
        model = CourseCertificateSignatories

    program_page = factory.SubFactory(ProgramPageFactory)
    course = factory.SubFactory(CourseFactory)
    name = factory.Faker('name')
    title_line_1 = factory.Faker('text')
    title_line_2 = factory.Faker('text')
    organization = factory.Faker('text')
    signature_image = factory.SubFactory(ImageFactory)


class ProgramCertificateSignatoriesFactory(DjangoModelFactory):
    """Factory for PrgoramCertificateSignatories"""

    class Meta:
        model = ProgramCertificateSignatories

    program_page = factory.SubFactory(ProgramPageFactory)
    name = factory.Faker('name')
    title_line_1 = factory.Faker('text')
    title_line_2 = factory.Faker('text')
    organization = factory.Faker('text')
    signature_image = factory.SubFactory(ImageFactory)


class ProgramLetterSignatoryFactory(DjangoModelFactory):
    """Factory for ProgramLetterSignatory"""

    class Meta:
        model = ProgramLetterSignatory

    program_page = factory.SubFactory(ProgramPageFactory)
    name = factory.Faker('name')
    title_line_1 = factory.Faker('text')
    title_line_2 = factory.Faker('text')
    signature_image = factory.SubFactory(ImageFactory)
