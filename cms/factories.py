"""Factories for making test data"""
from contextlib import contextmanager
import os.path
import shutil
import tempfile

import factory
from factory.django import DjangoModelFactory
from wagtail.wagtailimages.models import Image
from willow.image import Image as WillowImage

from cms.models import ProgramPage, ProgramFaculty
from courses.factories import ProgramFactory


class ImageFactory(DjangoModelFactory):
    """Factory for Wagtail images"""
    class Meta:
        model = Image

    file = factory.Faker('uri_path')
    title = factory.Faker('file_name', extension="jpg")
    width = factory.Faker('pyint')
    height = factory.Faker('pyint')

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
    class Meta:
        model = ProgramPage

    path = '/'
    depth = 1
    title = factory.Faker('sentence', nb_words=4)

    program = factory.SubFactory(ProgramFactory)


class FacultyFactory(DjangoModelFactory):
    """Factory for program faculty"""
    class Meta:
        model = ProgramFaculty

    name = factory.Faker('name')
    title = "Ph.D"
    short_bio = factory.Faker('text')

    program_page = factory.SubFactory(ProgramPageFactory)
    image = factory.SubFactory(ImageFactory)
