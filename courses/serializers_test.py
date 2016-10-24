"""
Tests for serializers
"""

from django.test import override_settings
from courses.factories import CourseFactory, CourseRunFactory
from courses.serializers import CourseSerializer
from search.base import ESTestCase


class CourseSerializerTests(ESTestCase):
    """
    Tests for CourseSerializer
    """

    def test_course(self):  # pylint: disable=no-self-use
        """
        Make sure course serializes correctly
        """
        course = CourseFactory.create()
        result = CourseSerializer().to_representation(course)
        expected = {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "url": "",
            "enrollment_text": "Not available",
        }
        assert result == expected

    @override_settings(EDXORG_BASE_URL="http://192.168.33.10:8000")
    def test_course_with_run(self):  # pylint: disable=no-self-use
        """
        Make sure the course URL serializes properly
        """
        course_run = CourseRunFactory.create(edx_course_key='my-course-key')
        course = course_run.course
        result = CourseSerializer().to_representation(course)
        assert result['url'] == 'http://192.168.33.10:8000/courses/my-course-key/about'
        assert result['enrollment_text'] == course.enrollment_text
