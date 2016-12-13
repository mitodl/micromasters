"""
Tests for CMS serializers
"""
from search.base import ESTestCase
from cms.serializers import (
    FacultySerializer,
    RenditionSerializer,
    ProgramPageSerializer,
)
from cms.factories import FacultyFactory, ProgramPageFactory
from courses.factories import ProgramFactory, CourseFactory


# pylint: disable=no-self-use
class WagtailSerializerTests(ESTestCase):
    """
    Tests for WagtailSerializer
    """

    def test_faculty_serializer(self):
        """
        Make sure faculty image information is serialized correctly
        """
        faculty = FacultyFactory.create()
        rendition = faculty.image.get_rendition('fill-500x385')
        rendition_data = RenditionSerializer(rendition).data
        data = FacultySerializer(faculty).data
        assert data == {
            'name': faculty.name,
            'title': faculty.title,
            'short_bio': faculty.short_bio,
            'image': {
                'alt': faculty.image.default_alt_text,
                'rendition': rendition_data,
            }
        }

    def test_rendition_serializer(self):
        """
        Test rendition serializer
        """
        faculty = FacultyFactory.create()
        rendition = faculty.image.get_rendition('fill-1x1')
        data = RenditionSerializer(rendition).data
        assert data == {
            'file': rendition.url,
            'width': rendition.width,
            'height': rendition.height,
        }

    def test_program_page_serializer(self):
        """
        Test program page serializer
        """
        program = ProgramFactory.create(title="Supply Chain Management", course=None)
        course = CourseFactory.create(program=program, title="Learning How to Supply", course_run=None)
        page = ProgramPageFactory.create(program=program, title=program.title)
        faculty = FacultyFactory.create(
            program_page=page, name="Charles Fluffles", image=None,
        )

        data = ProgramPageSerializer(page).data
        assert data == {
            "id": program.id,
            "title": "Supply Chain Management",
            "slug": "supply-chain-management",
            "faculty": [{
                "name": "Charles Fluffles",
                "title": faculty.title,
                "short_bio": faculty.short_bio,
                "image": None,
            }],
            "courses": [{
                "id": course.id,
                "title": "Learning How to Supply",
                "description": course.description,
                "url": course.url,
                "enrollment_text": "Not available",
            }]
        }
