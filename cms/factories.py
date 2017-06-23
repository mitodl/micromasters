"""Factories for making test data"""
from tempfile import NamedTemporaryFile
import uuid

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyText
from robohash import Robohash
from wagtail.wagtailimages.models import Image

from cms.models import (
    HomePage,
    InfoLinks,
    ProgramPage,
    ProgramFaculty,
    ProgramCourse,
    SemesterDate,
)
from courses.factories import ProgramFactory, CourseFactory


class ImageFactory(DjangoModelFactory):
    """Factory for Wagtail images"""
    class Meta:
        model = Image

    title = factory.Faker('file_name', extension="jpg")
    width = factory.Faker('pyint')
    height = factory.Faker('pyint')

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        image = model_class.objects.create(*args, **kwargs)

        name = uuid.uuid4().hex
        robohash = Robohash(name)
        roboset = robohash.sets[0]
        robohash.assemble(roboset=roboset)

        with NamedTemporaryFile() as f:
            robohash.img.save(f, format='jpeg')
            f.seek(0)
            image.file.save(name, f)

        return image


class ProgramPageFactory(DjangoModelFactory):
    """Factory for ProgramPage"""
    class Meta:
        model = ProgramPage

    title = factory.Faker('sentence', nb_words=4)
    description = factory.Faker('text')
    program = factory.SubFactory(ProgramFactory)
    faculty_description = factory.Faker('paragraph')
    program_contact_email = factory.Faker('email')
    title_over_image = factory.Faker('sentence')

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        home_page = HomePage.objects.first()
        page = model_class(*args, **kwargs)
        home_page.add_child(instance=page)
        page.save_revision().publish()
        return page


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
