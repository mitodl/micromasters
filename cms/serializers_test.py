"""
Tests for CMS serializers
"""
from search.base import ESTestCase
from cms.serializers import (
    FacultySerializer,
    RenditionSerializer,
)
from cms.factories import FacultyFactory


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
        result = FacultySerializer().to_representation(faculty)
        assert result == {
            'name': faculty.name,
            'title': faculty.title,
            'short_bio': faculty.short_bio,
            'image': {
                'alt': faculty.image.default_alt_text,
                'rendition': RenditionSerializer().to_representation(faculty.image.get_rendition('fill-500x385'))
            }
        }

    def test_rendition_serializer(self):
        """
        Test rendition serializer
        """
        faculty = FacultyFactory.create()
        rendition = faculty.image.get_rendition('fill-1x1')
        assert RenditionSerializer().to_representation(rendition) == {
            'file': rendition.url,
            'width': rendition.width,
            'height': rendition.height,
        }
