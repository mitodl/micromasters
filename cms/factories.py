"""Factories for making test data"""
from contextlib import contextmanager
import os.path
import shutil
import tempfile

from django.utils.text import slugify
import factory
from factory.django import DjangoModelFactory
import faker
from wagtail.wagtailimages.models import Image
from wagtail.wagtailimages.tests.utils import get_test_image_file_jpeg
from willow.image import Image as WillowImage

from cms.models import HomePage, ProgramPage, ProgramFaculty
from courses.factories import ProgramFactory


FAKE = faker.Factory.create()


class ImageFactory(DjangoModelFactory):
    """Factory for Wagtail images"""
    class Meta:  # pylint: disable=missing-docstring
        model = Image

    title = factory.LazyAttribute(lambda x: FAKE.file_name(extension="jpg"))
    width = factory.LazyAttribute(lambda x: FAKE.pyint())
    height = factory.LazyAttribute(lambda x: FAKE.pyint())

    @factory.lazy_attribute
    def file(self):
        """Get a fake file for testing directly from wagtail"""
        size = (self.width, self.height)
        return get_test_image_file_jpeg(filename=self.title, size=size)

    @factory.post_generation
    def fake_willow_image(self, create, extracted, **kwargs):  # pylint: disable=unused-argument
        """
        Build a fake implementation of the `get_willow_image()` method
        """
        image_dir = tempfile.mkdtemp()
        origin_image_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "test_resources", "stata_center.jpg",
        )
        shutil.copy(origin_image_path, image_dir)
        fake_image_path = os.path.join(image_dir, "stata_center.jpg")
        fake_image = WillowImage.open(open(fake_image_path, "rb"))

        @contextmanager
        def get_fake_willow():  # pylint: disable=missing-docstring
            yield fake_image

        self.get_willow_image = get_fake_willow  # pylint: disable=attribute-defined-outside-init
        return self


class ProgramPageFactory(DjangoModelFactory):
    """Factory for ProgramPage"""
    class Meta:  # pylint: disable=missing-docstring
        model = ProgramPage

    path = '/'
    depth = 1

    @factory.lazy_attribute
    def title(self):
        return self.program.title

    @factory.lazy_attribute
    def slug(self):
        return slugify(self.title)

    program = factory.SubFactory(ProgramFactory)

    @factory.post_generation
    def set_homepage_as_parent(self, create, extracted, **kwargs):  # pylint: disable=unused-argument
        """
        Set this page as a child of the homepage, so that Wagtail marks
        this page as routable and it can generate a URL.
        """
        homepage = HomePage.objects.first()
        self.set_url_path(homepage)
        return self


class FacultyFactory(DjangoModelFactory):
    """Factory for program faculty"""
    class Meta:  # pylint: disable=missing-docstring
        model = ProgramFaculty

    name = factory.LazyAttribute(lambda x: FAKE.name())
    title = "Ph.D"
    short_bio = factory.LazyAttribute(lambda x: FAKE.text())

    program_page = factory.SubFactory(ProgramPageFactory)
    image = factory.SubFactory(ImageFactory)
