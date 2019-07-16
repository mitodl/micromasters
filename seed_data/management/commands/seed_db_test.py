"""
Tests for library functions used by seed_db and alter_data commands
"""
from django.db.models.signals import post_save
from django.contrib.auth.models import User
from factory.django import mute_signals

from dashboard.models import CachedEnrollment
from courses.factories import ProgramFactory, CourseRunFactory
from courses.models import Program
from seed_data.management.commands.seed_db import (
    MODEL_DEFAULTS,
    FAKE_USER_USERNAME_PREFIX,
    compile_model_data,
    deserialize_model_data,
    deserialize_program_data_list,
    deserialize_user_data,
    deserialize_course_data,
)
from search.base import MockedESTestCase


class SeedDBUtilityTests(MockedESTestCase):
    """Tests for utility functions used by the seed_db command"""
    def test_compile_model_data(self):
        """Tests that compile_model_data creates a dict of model data"""
        model_data = compile_model_data(User, {'email': 'email1@example.com'})
        assert model_data['email'] == 'email1@example.com'
        for k, v in MODEL_DEFAULTS[User].items():
            assert model_data[k] == v

    def test_compile_model_data_with_added_params(self):
        """Tests that additional params can be set in compile_model_data"""
        model_data = compile_model_data(User, {'email': 'email1@example.com'}, username='username1')
        assert model_data['username'] == 'username1'

    def test_deserialize_model_data(self):
        """Tests that deserialize_model_data creates a new model object"""
        model_obj = deserialize_model_data(User, {'email': 'email1@example.com'}, username='username1')
        assert model_obj.email == 'email1@example.com'
        assert model_obj.username == 'username1'
        assert model_obj.id is not None


class SeedDBDeserializationTests(MockedESTestCase):
    """Tests for object deserializers used by the seed_db command"""
    USER_DATA = {
        "first_name": "Mario",
        "last_name": "Medina",
        "edx_name": "Mario",
        "state_or_territory": "ES-AS",
        "gender": "m",
        "email": "mario.medina@example.com",
        "nationality": "ES",
        "city": "M\u00e1laga",
        "date_of_birth": "1961-04-29",
        "preferred_name": "Mario",
        "country": "ES",
        "birth_country": "ES",
        "work_history": [
            {
                "industry": "Computer Software",
                "state_or_territory": "ES-AS",
                "start_date": "2014-11-22",
                "position": "Software Engineer",
                "country": "ES",
                "company_name": "Microsoft",
                "city": "M\u00e1laga"
            }
        ],
        "education": [
            {
                "school_city": "M\u00e1laga",
                "degree_name": "hs",
                "field_of_study": "45.0902",
                "school_state_or_territory": "ES-AS",
                "school_country": "ES",
                "graduation_date": "1979-04-29",
                "school_name": "M\u00e1laga High School"
            },
        ],
        "_enrollments": [{
            "edx_course_key": "course-v1:MITx+Analog+Learning+100+Aug_2015"
        }],
        "_grades": [{
            "grade": "0.87",
            "edx_course_key": "course-v1:MITx+Analog+Learning+100+Aug_2015"
        }],
    }

    COURSE_DATA = {
        "description": "An introductory course to Digital Learning",
        "course_runs": [
            {
                "enrollment_start": "2016-01-15T00:00:00+00:00",
                "edx_course_key": "course-v1:MITx+Digital+Learning+100+Jan_2016",
                "enrollment_end": "2016-01-29T00:00:00+00:00",
                "title": "Digital Learning 100 - January 2016",
                "upgrade_deadline": "2016-01-22T00:00:00+00:00",
                "end_date": "2016-05-15T00:00:00+00:00",
                "start_date": "2016-01-15T00:00:00+00:00"
            },
        ],
        "title": "Digital Learning 100",
        "position_in_program": 1
    }

    PROGRAM_DATA = {
        "title": "Digital Learning",
        "price": 1000,
        "description": "Learn stuff about digital learning.",
        "financial_aid_availability": True,
        "num_required_courses": 1,
        "courses": [
            {
                "title": "Digital Learning 100",
                "position_in_program": 1,
                "description": "An introductory course to Digital Learning",
                "course_runs": [
                    {
                        "title": "Digital Learning 100 - January 2016",
                        "upgrade_deadline": "2016-01-22T00:00:00+00:00",
                        "edx_course_key": "course-v1:MITx+Digital+Learning+100+Jan_2016",
                        "enrollment_start": "2016-01-15T00:00:00+00:00",
                        "end_date": "2016-05-15T00:00:00+00:00",
                        "start_date": "2016-01-15T00:00:00+00:00",
                        "enrollment_end": "2016-01-29T00:00:00+00:00"
                    },
                    {
                        "title": "Digital Learning 100 - August 2016",
                        "upgrade_deadline": "2016-08-22T00:00:00+00:00",
                        "edx_course_key": "course-v1:MITx+Digital+Learning+100+Aug_2016",
                        "enrollment_start": "2016-08-15T00:00:00+00:00",
                        "end_date": "2016-12-15T00:00:00+00:00",
                        "start_date": "2016-08-15T00:00:00+00:00",
                        "enrollment_end": "2016-08-29T00:00:00+00:00"
                    },
                ]
            },
        ]
    }

    def test_deserialize_user_data(self):
        """Test that user data is correctly deserialized"""
        new_course_run = CourseRunFactory.create(edx_course_key='course-v1:MITx+Analog+Learning+100+Aug_2015')
        new_program = new_course_run.course.program
        with mute_signals(post_save):
            user = deserialize_user_data(self.USER_DATA, [new_program])
        assert user.username == '{}mario.medina'.format(FAKE_USER_USERNAME_PREFIX)
        assert user.profile.first_name == 'Mario'
        assert user.profile.date_of_birth == '1961-04-29'
        assert CachedEnrollment.objects.filter(user=user, course_run=new_course_run).count() == 1

    def test_deserialize_course_data(self):
        """Test that course data is correctly deserialized"""
        new_program = ProgramFactory.create()
        new_course = deserialize_course_data(new_program, self.COURSE_DATA)
        new_course_runs = new_course.courserun_set.all()
        assert new_course.title == 'Digital Learning 100'
        assert len(new_course_runs) == 1
        assert new_course_runs[0].title == 'Digital Learning 100 - January 2016'

    def test_deserialize_program_data_list(self):
        """Test that program data is correctly deserialized"""
        programs = deserialize_program_data_list([self.PROGRAM_DATA])
        assert Program.objects.count() == 1
        assert len(programs) == 1
        program = programs[0]
        for program_key in ('title', 'description', 'financial_aid_availability'):
            assert getattr(program, program_key) == self.PROGRAM_DATA[program_key]
        assert program.live is True

        assert program.course_set.count() == 1
        course = program.course_set.first()
        for course_key in ('title', 'position_in_program', 'description'):
            assert getattr(course, course_key) == self.PROGRAM_DATA['courses'][0][course_key]

        assert course.courserun_set.count() == 2
        for i, run in enumerate(course.courserun_set.all()):
            for key in ('title', 'edx_course_key'):
                assert getattr(run, key) == self.PROGRAM_DATA['courses'][0]['course_runs'][i][key]
