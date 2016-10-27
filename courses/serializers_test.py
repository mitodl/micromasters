"""
Tests for serializers
"""

from django.test import override_settings
from mock import Mock

from cms.factories import ProgramPageFactory
from cms.models import HomePage
from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
)
from courses.serializers import (
    CourseSerializer,
    ProgramSerializer,
)
from dashboard.models import ProgramEnrollment
from profiles.factories import UserFactory
from search.base import ESTestCase


# pylint: disable=no-self-use
class CourseSerializerTests(ESTestCase):
    """
    Tests for CourseSerializer
    """

    def test_course(self):
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
    def test_course_with_run(self):
        """
        Make sure the course URL serializes properly
        """
        course_run = CourseRunFactory.create(edx_course_key='my-course-key')
        course = course_run.course
        result = CourseSerializer().to_representation(course)
        assert result['url'] == 'http://192.168.33.10:8000/courses/my-course-key/about'
        assert result['enrollment_text'] == course.enrollment_text


class ProgramSerializerTests(ESTestCase):
    """
    Tests for ProgramSerializer
    """

    def test_program_no_programpage(self):
        """
        Test ProgramSerializer without a program page
        """
        program = ProgramFactory.create()
        assert ProgramSerializer().to_representation(program) == {
            'id': program.id,
            'title': program.title,
            'programpage_url': None,
            'enrolled': False,
        }

    def test_program_with_programpage(self):
        """
        Test ProgramSerializer with a program page attached
        """
        program = ProgramFactory.create()
        programpage = ProgramPageFactory.build(program=program)
        homepage = HomePage.objects.first()
        homepage.add_child(instance=programpage)
        assert ProgramSerializer().to_representation(program) == {
            'id': program.id,
            'title': program.title,
            'programpage_url': programpage.url,
            'enrolled': False,
        }
        assert len(programpage.url) > 0

    def test_program_enrolled(self):
        """
        Test ProgramSerializer with an enrolled user
        """
        program = ProgramFactory.create()
        user = UserFactory.create()
        ProgramEnrollment.objects.create(user=user, program=program)
        request = Mock(user=user)
        assert ProgramSerializer(context={"request": request}).to_representation(program) == {
            'id': program.id,
            'title': program.title,
            'programpage_url': None,
            'enrolled': True,
        }
