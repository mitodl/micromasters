"""
Tests for library functions used by seed_db and alter_data commands
"""

from micromasters.factories import UserFactory
from courses.factories import ProgramFactory, CourseFactory, CourseRunFactory
from seed_data.lib import (
    CourseFinder,
    CourseRunFinder,
    UserFinder,
)
from search.base import MockedESTestCase


class UserFinderTests(MockedESTestCase):
    """Test cases for UserFinder"""
    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory.create(username='username1', email='email1@example.com')
        UserFactory.create(username='username2', email='email2@example.com')

    def test_user_finder_success(self):
        """Tests that UserFinder will return a desired user"""
        found_users = [
            UserFinder.find(username='username1'),
            UserFinder.find(username='name1'),
            UserFinder.find(email='email1@example.com'),
            UserFinder.find(email='email1'),
        ]
        assert all([self.user == found_user for found_user in found_users])

    def test_user_finder_failure(self):
        """Tests that UserFinder will fail with unspecific/incorrect parameters"""
        failing_search_param_sets = [
            dict(username='username'),
            dict(email='email'),
            dict(username='nonexistent_user'),
            dict(nonsense_param='value'),
        ]
        for param_set in failing_search_param_sets:
            with self.assertRaises(Exception):
                UserFinder.find(**param_set)


class CourseFinderTests(MockedESTestCase):
    """Test cases for CourseFinder"""
    def test_course_finder_success(self):
        """Tests that CourseFinder will return a desired course"""
        program = ProgramFactory.create(title='program1')
        course = CourseFactory.create(title='Course Lvl 100', program=program)
        CourseFactory.create(title='Course Lvl 200', program=program)
        CourseFactory.create(title='Course Lvl 300', program=program)
        CourseFactory.create(title='Other Course 100', program__title='program2')

        found_courses = [
            CourseFinder.find(course_title='Course Lvl 100'),
            CourseFinder.find(course_title='Lvl 100'),
            CourseFinder.find(program_title='program1', course_level='100')
        ]
        assert all([course == found_course for found_course in found_courses])


class CourseRunFinderTests(MockedESTestCase):
    """Test cases for CourseRunFinder"""
    def test_course_run_finder_success(self):
        """Tests that CourseRunFinder will return a desired course run"""
        course_run = CourseRunFactory.create(title='courserun1', edx_course_key='coursekey1')
        CourseRunFactory.create(title='courserun2', edx_course_key='coursekey2')

        found_course_runs = [
            CourseRunFinder.find(course_run_title='courserun1'),
            CourseRunFinder.find(course_run_title='run1'),
            CourseRunFinder.find(course_run_key='coursekey1'),
            CourseRunFinder.find(course_run_key='key1')
        ]
        assert all([course_run == found_course_run for found_course_run in found_course_runs])
