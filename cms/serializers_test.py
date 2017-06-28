"""
Tests for CMS serializers
"""
from search.base import MockedESTestCase
from cms.serializers import (
    CourseSerializer,
    FacultySerializer,
    RenditionSerializer,
    ProgramPageSerializer,
)
from cms.factories import (
    FacultyFactory,
    ProgramPageFactory,
)
from courses.factories import CourseFactory


class WagtailSerializerTests(MockedESTestCase):
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
        page = ProgramPageFactory.create()
        courses = CourseFactory.create_batch(3, program=page.program)
        faculty = FacultyFactory.create_batch(3, program_page=page)

        data = ProgramPageSerializer(page).data
        data['faculty'] = sorted(data['faculty'], key=lambda member: member['name'])
        assert data == {
            "id": page.program.id,
            "title": page.title,
            "slug": ProgramPageSerializer().get_slug(page),
            "faculty": FacultySerializer(sorted(faculty, key=lambda member: member.name), many=True).data,
            "courses": CourseSerializer(courses, many=True).data,
        }
