"""
Tests for serializers
"""
from search.base import ESTestCase
from cms.serializers import FacultySerializer
from cms.factories import FacultyFactory


class WagtailSerializerTests(ESTestCase):
    """
    Tests for CourseRunSerializer
    """

    def test_faculty_serializer(self):  # pylint: disable=no-self-use
        """
        Make sure program id appears correctly
        """
        faculty = FacultyFactory.create()
        result = FacultySerializer().to_representation(faculty)
        assert result['name'] == faculty.name
        assert result['short_bio'] == faculty.short_bio
