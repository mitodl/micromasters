"""
Tests for serializers
"""

from unittest.mock import Mock

from cms.factories import ProgramPageFactory
from cms.models import HomePage
from courses.factories import (
    CourseFactory,
    CourseRunFactory,
    ProgramFactory,
)
from courses.models import ElectiveCourse, ElectivesSet
from courses.serializers import (
    CourseSerializer,
    ProgramSerializer,
    CourseRunSerializer, ElectivesSetSerializer)
from dashboard.models import ProgramEnrollment
from profiles.factories import UserFactory
from search.base import MockedESTestCase


class CourseSerializerTests(MockedESTestCase):
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
            "enrollment_text": "Not available"
        }
        assert data == expected

    def test_course_with_run(self):
        """
        Make sure the course URL serializes properly
        """
        course_run = CourseRunFactory.create()
        course = course_run.course
        data = CourseSerializer(course).data
        assert data['url'] == course_run.enrollment_url
        assert data['enrollment_text'] == course.enrollment_text


class CourseRunSerializerTests(MockedESTestCase):
    """
    Tests for CourseRunSerializer
    """

    def test_course_run(self):
        """
        Make sure course run serializer correctly
        """
        course_run = CourseRunFactory.create()
        data = CourseRunSerializer(course_run).data
        expected = {
            'edx_course_key': course_run.edx_course_key,
            'program_title': course_run.course.program.title,
        }
        assert data == expected


class ProgramSerializerTests(MockedESTestCase):
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
            'total_courses': 0,
            'topics': [{'name': topic.name} for topic in self.program.topics.iterator()]
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
            'programpage_url': programpage.get_full_url(),
            'enrolled': False,
            'total_courses': 0,
            'topics': [{'name': topic.name} for topic in self.program.topics.iterator()]
        }
        assert len(programpage.url) > 0

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
            'total_courses': 0,
            'topics': [{'name': topic.name} for topic in self.program.topics.iterator()]
        }

    def test_program_courses(self):
        """
        Test ProgramSerializer with multiple courses
        """
        CourseFactory.create_batch(5, program=self.program)
        data = ProgramSerializer(self.program, context=self.context).data
        assert data == {
            'id': self.program.id,
            'title': self.program.title,
            'programpage_url': None,
            'enrolled': False,
            'total_courses': 5,
            'topics': [{'name': topic.name} for topic in self.program.topics.iterator()]
        }


class ElectivesSetSerializerTests(MockedESTestCase):
    """
    Tests for ElectivesSetSerializer
    """

    def test_elective_set(self):
        """
        Make sure course that elective set serializer works correctly
        """
        courses = CourseFactory.create_batch(3)
        elective_set = ElectivesSet.objects.create(program=courses[0].program, title="Elective", required_number=2)
        for course in courses:
            ElectiveCourse.objects.create(course=course, electives_set=elective_set)
        data = ElectivesSetSerializer(elective_set).data
        assert data == {
            "required_number": elective_set.required_number,
            "title": elective_set.title,
            "courses": CourseSerializer(courses, many=True).data,
        }
