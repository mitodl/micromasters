"""Factories for making test data"""
import factory
from factory.django import DjangoModelFactory
import faker

from wagtail.wagtailimages.models import Image
from cms.models import ProgramPage, ProgramFaculty
from courses.factories import ProgramFactory


FAKE = faker.Factory.create()


class ImageFactory(DjangoModelFactory):
    """Factory for Wagtail images"""
    class Meta:  # pylint: disable=missing-docstring
        model = Image

    file = factory.LazyAttribute(lambda x: FAKE.uri_path())
    title = factory.LazyAttribute(lambda x: FAKE.file_name(extension="jpg"))
    width = factory.LazyAttribute(lambda x: FAKE.pyint())
    height = factory.LazyAttribute(lambda x: FAKE.pyint())


class ProgramPageFactory(DjangoModelFactory):
    """Factory for ProgramPage"""
    class Meta:  # pylint: disable=missing-docstring
        model = ProgramPage

    path = '/'
    depth = 1
    title = factory.LazyAttribute(lambda x: FAKE.sentence(nb_words=4))

    program = factory.SubFactory(ProgramFactory)


class FacultyFactory(DjangoModelFactory):
    """Factory for program faculty"""
    class Meta:  # pylint: disable=missing-docstring
        model = ProgramFaculty

    name = factory.LazyAttribute(lambda x: FAKE.name())
    title = "Ph.D"
    short_bio = factory.LazyAttribute(lambda x: FAKE.text())

    program_page = factory.SubFactory(ProgramPageFactory)
    image = factory.SubFactory(ImageFactory)
