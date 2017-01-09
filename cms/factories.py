"""Factories for making test data"""
from contextlib import contextmanager
import os.path
import shutil
import tempfile

import factory
from factory.django import DjangoModelFactory
import faker
from wagtail.wagtailimages.models import Image
from willow.image import Image as WillowImage

from cms.models import ProgramPage, ProgramFaculty
from courses.factories import ProgramFactory


FAKE = faker.Factory.create()


class ImageFactory(DjangoModelFactory):
    """Factory for Wagtail images"""
    class Meta:  # pylint: disable=missing-docstring
        model = Image

    file = factory.LazyFunction(FAKE.uri_path)
    title = factory.LazyFunction(lambda: FAKE.file_name(extension="jpg"))
    width = factory.LazyFunction(FAKE.pyint)
    height = factory.LazyFunction(FAKE.pyint)

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
    title = factory.LazyFunction(lambda: FAKE.sentence(nb_words=4))

    program = factory.SubFactory(ProgramFactory)


class FacultyFactory(DjangoModelFactory):
    """Factory for program faculty"""
    class Meta:  # pylint: disable=missing-docstring
        model = ProgramFaculty

    name = factory.LazyFunction(FAKE.name)
    title = "Ph.D"
    short_bio = factory.LazyFunction(FAKE.text)

    program_page = factory.SubFactory(ProgramPageFactory)
    image = factory.SubFactory(ImageFactory)
