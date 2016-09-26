"""Factories for making test data"""
import factory
from factory.django import DjangoModelFactory
import faker
from io import BytesIO
from contextlib import contextmanager

import mock
# from willow.image import Image as WillowImage
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

    @factory.post_generation
    def fake_willow_image(self, create, extracted, **kwargs):
        fake_willow = mock.Mock()
        fake_willow.closed = False
        fake_willow.auto_orient.return_value = fake_willow
        fake_willow.resize.return_value = fake_willow
        fake_willow.get_size.return_value = 500, 385
        fake_willow.format_name = "jpeg"
        fake_willow.save.return_value = fake_willow
        fake_willow.save_as_jpeg.return_value = fake_willow
        fake_willow.f = fake_willow

        @contextmanager
        def get_fake_willow():
            yield fake_willow

        # self.get_willow_image = mock.Mock(return_value=get_fake_willow)
        self.get_willow_image = get_fake_willow
        return self


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
