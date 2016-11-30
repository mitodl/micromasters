"""
Tests for serializers
"""

from unittest.mock import Mock
from django.test import override_settings

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
        data = CourseSerializer(course).data
        expected = {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "url": "",
            "enrollment_text": "Not available",
        }
        assert data == expected

    @override_settings(EDXORG_BASE_URL="http://192.168.33.10:8000")
    def test_course_with_run(self):
        """
        Make sure the course URL serializes properly
        """
        course_run = CourseRunFactory.create(edx_course_key='my-course-key')
        course = course_run.course
        data = CourseSerializer(course).data
        assert data['url'] == 'http://192.168.33.10:8000/courses/my-course-key/about'
        assert data['enrollment_text'] == course.enrollment_text


class ProgramSerializerTests(ESTestCase):
    """
    Tests for ProgramSerializer
    """

    @classmethod
    def setUpTestData(cls):
        """Create a program and user to test with"""
        super().setUpTestData()

        cls.program = ProgramFactory.create()
        cls.user = UserFactory.create()
        cls.context = {
            "request": Mock(user=cls.user)
        }

    def test_program_no_programpage(self):
        """
        Test ProgramSerializer without a program page
        """
        data = ProgramSerializer(self.program, context=self.context).data
        assert data == {
            'id': self.program.id,
            'title': self.program.title,
            'programpage_url': None,
            'enrolled': False,
        }

    def test_program_with_programpage(self):
        """
        Test ProgramSerializer with a program page attached
        """
        programpage = ProgramPageFactory.build(program=self.program)
        homepage = HomePage.objects.first()
        homepage.add_child(instance=programpage)
        data = ProgramSerializer(self.program, context=self.context).data
        assert data == {
            'id': self.program.id,
            'title': self.program.title,
            'programpage_url': programpage.url,
            'enrolled': False,
        }
        assert len(programpage.url) > 0

    def test_program_with_external_url(self):
        """
        Test ProgramSerializer with a program page that has an external url
        """
        url = 'http://example.com/external-url/'
        programpage = ProgramPageFactory.build(
            program=self.program,
            external_program_page_url=url,
        )
        homepage = HomePage.objects.first()
        homepage.add_child(instance=programpage)
        data = ProgramSerializer(self.program, context=self.context).data
        assert data == {
            'id': self.program.id,
            'title': self.program.title,
            'programpage_url': url,
            'enrolled': False,
        }
        assert programpage.url != url

    def test_program_enrolled(self):
        """
        Test ProgramSerializer with an enrolled user
        """
        ProgramEnrollment.objects.create(user=self.user, program=self.program)
        data = ProgramSerializer(self.program, context=self.context).data
        assert data == {
            'id': self.program.id,
            'title': self.program.title,
            'programpage_url': None,
            'enrolled': True,
        }
