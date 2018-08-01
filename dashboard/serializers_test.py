"""
Test cases for the UserProgramSearchSerializer
"""
from unittest.mock import patch
from datetime import datetime
import ddt
import faker
import pytz
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import (
    ProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from dashboard.api_edx_cache import CachedEdxUserData
from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from dashboard.models import ProgramEnrollment
from dashboard.serializers import (
    UserProgramSearchSerializer,
    UnEnrollProgramsSerializer
)
from dashboard.utils import MMTrack
from ecommerce.factories import (
    OrderFactory,
    LineFactory,
)
from financialaid.api_test import (
    create_program,
)
from profiles.factories import (
    EducationFactory,
    EmploymentFactory,
    ProfileFactory,
)
from roles.models import Role
from roles.roles import Staff
from search.base import MockedESTestCase
from grades.factories import FinalGradeFactory


@ddt.ddt
class UserProgramSearchSerializerTests(MockedESTestCase):
    """
    Test cases for the UserProgramSearchSerializer
    """

    @staticmethod
    def _generate_cached_enrollments(user, program, num_course_runs=1, data=None):
        """
        Helper method to generate CachedEnrollments for test cases
        """
        fake = faker.Factory.create()
        course = CourseFactory.create(program=program)
        course_run_params = dict(before_now=True, after_now=False, tzinfo=pytz.utc)
        course_runs = [
            CourseRunFactory.create(
                course=course,
                enrollment_start=fake.date_time_this_month(**course_run_params),
                start_date=fake.date_time_this_month(**course_run_params),
                enrollment_end=fake.date_time_this_month(**course_run_params),
                end_date=fake.date_time_this_year(**course_run_params),
            ) for _ in range(num_course_runs)
        ]
        factory_kwargs = dict(user=user)
        if data is not None:
            factory_kwargs['data'] = data
        return [CachedEnrollmentFactory.create(course_run=course_run, **factory_kwargs) for course_run in course_runs]

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = profile = ProfileFactory.create()
        cls.user = profile.user
        EducationFactory.create(profile=profile)
        EmploymentFactory.create(profile=profile)
        # create a normal program
        program = ProgramFactory.create()
        cls.enrollments = cls._generate_cached_enrollments(cls.user, program, num_course_runs=2)
        certificate_grades_vals = [0.7, 0.8]
        cls.current_grades_vals = [0.9, 1.0]
        cls.certificates = []
        cls.current_grades = []
        for i, enrollment in enumerate(cls.enrollments):
            cls.certificates.append(
                CachedCertificateFactory.create(
                    user=cls.user,
                    course_run=enrollment.course_run,
                    data={
                        "grade": certificate_grades_vals[i],
                        "certificate_type": "verified",
                        "course_id": enrollment.course_run.edx_course_key,
                        "status": "downloadable",
                    }
                )
            )
            cls.current_grades.append(
                CachedCurrentGradeFactory.create(
                    user=cls.user,
                    course_run=enrollment.course_run,
                    data={
                        "passed": True,
                        "percent": cls.current_grades_vals[i],
                        "course_key": enrollment.course_run.edx_course_key,
                    }
                )
            )
            FinalGradeFactory.create(
                user=cls.user,
                course_run=enrollment.course_run,
                grade=certificate_grades_vals[i],
                passed=True,
            )
        non_fa_cached_edx_data = CachedEdxUserData(cls.user, program=program)
        non_fa_mmtrack = MMTrack(cls.user, program, non_fa_cached_edx_data)
        cls.serialized_enrollments = UserProgramSearchSerializer.serialize_enrollments(non_fa_mmtrack)
        cls.serialized_course_enrollments = UserProgramSearchSerializer.serialize_course_enrollments(non_fa_mmtrack)
        cls.semester_enrollments = UserProgramSearchSerializer.serialize_course_runs_enrolled(non_fa_mmtrack)
        cls.program_enrollment = ProgramEnrollment.objects.create(user=cls.user, program=program)
        # create a financial aid program
        cls.fa_program, _ = create_program()
        cls.fa_program_enrollment = ProgramEnrollment.objects.create(user=cls.user, program=cls.fa_program)
        cls.fa_enrollments = cls._generate_cached_enrollments(cls.user, cls.fa_program, num_course_runs=2)
        cls.current_grades = []
        for i, enrollment in enumerate(cls.fa_enrollments):
            order = OrderFactory.create(user=cls.user, status='fulfilled')
            LineFactory.create(order=order, course_key=enrollment.course_run.edx_course_key)
            cls.current_grades.append(
                CachedCurrentGradeFactory.create(
                    user=cls.user,
                    course_run=enrollment.course_run,
                    data={
                        "passed": True,
                        "percent": cls.current_grades_vals[i],
                        "course_key": enrollment.course_run.edx_course_key,
                    }
                )
            )
            FinalGradeFactory.create(
                user=cls.user,
                course_run=enrollment.course_run,
                grade=cls.current_grades_vals[i],
                passed=True,
            )
        fa_cached_edx_data = CachedEdxUserData(cls.user, program=cls.fa_program)
        fa_mmtrack = MMTrack(cls.user, cls.fa_program, fa_cached_edx_data)
        cls.fa_serialized_course_enrollments = (
            UserProgramSearchSerializer.serialize_course_enrollments(fa_mmtrack)
        )
        cls.fa_serialized_enrollments = (
            UserProgramSearchSerializer.serialize_enrollments(fa_mmtrack)
        )

    def test_full_program_user_serialization(self):
        """
        Tests that full ProgramEnrollment serialization works as expected
        """
        self.profile.refresh_from_db()
        program = self.program_enrollment.program
        expected_values = {
            'id': program.id,
            'enrollments': self.serialized_enrollments,
            'courses': self.serialized_course_enrollments,
            'course_runs': self.semester_enrollments,
            'grade_average': 75,
            'is_learner': True,
            'num_courses_passed': 1,
            'total_courses': 1
        }
        serialized_enrollments = UserProgramSearchSerializer.serialize(self.program_enrollment)
        assert serialized_enrollments == expected_values

    def test_full_program_user_serialization_financial_aid(self):
        """
        Tests that full ProgramEnrollment serialization works as expected
        for financial aid programs.
        the difference with test_full_program_user_serialization
        is that the grade is calculated using the current grades
        """
        self.profile.refresh_from_db()
        expected_result = {
            'id': self.fa_program.id,
            'enrollments': self.fa_serialized_enrollments,
            'courses': self.fa_serialized_course_enrollments,
            'course_runs': self.semester_enrollments,
            'grade_average': 95,
            'is_learner': True,
            'num_courses_passed': 1,
            'total_courses': 2
        }
        serialized_enrollments = UserProgramSearchSerializer.serialize(self.fa_program_enrollment)
        assert serialized_enrollments == expected_result

    def test_full_program_user_serialization_staff(self):
        """
        Tests that when user has staff role, the serialization shows that she is not a learner.
        """
        self.profile.refresh_from_db()
        program = self.program_enrollment.program
        Role.objects.create(
            user=self.user,
            program=program,
            role=Staff.ROLE_ID
        )
        expected_result = {
            'id': program.id,
            'enrollments': self.serialized_enrollments,
            'courses': self.serialized_course_enrollments,
            'course_runs': self.semester_enrollments,
            'grade_average': 75,
            'is_learner': False,
            'num_courses_passed': 1,
            'total_courses': 1
        }
        serialized_enrollments = UserProgramSearchSerializer.serialize(self.program_enrollment)
        assert serialized_enrollments == expected_result

    def test_full_program_user_serialization_with__no_passed_course(self):
        """
        Tests that full ProgramEnrollment serialization works as expected when user
        has no passed courses.
        """
        with patch.object(MMTrack, 'count_courses_passed', return_value=0):
            self.profile.refresh_from_db()
            program = self.program_enrollment.program
            expected_result = {
                'id': program.id,
                'enrollments': self.serialized_enrollments,
                'courses': self.serialized_course_enrollments,
                'course_runs': self.semester_enrollments,
                'grade_average': 75,
                'is_learner': True,
                'num_courses_passed': 0,
                'total_courses': 1
            }
            serialized_enrollments = UserProgramSearchSerializer.serialize(self.program_enrollment)
            assert serialized_enrollments == expected_result


class UserProgramSerializerEnrollmentsTests(MockedESTestCase):
    """
    Test cases for the serialization of a user's course enrollments for search results
    """

    @staticmethod
    def generate_course_with_runs(program, course_params=None, course_run_count=1):
        """
        Helper method to generate a Course with CourseRuns for a Program
        """
        course_params = course_params or {}
        course = CourseFactory.create(program=program, **course_params)
        course_runs = CourseRunFactory.create_batch(course_run_count, course=course)
        return course, course_runs

    @classmethod
    def is_course_serialized(cls, serialized_enrollments, course):
        """
        Helper method to test if a course appears in serialized enrollments

        Args:
            serialized_enrollments (list): A list of serialized enrollments
            course (dashboard.models.Course): A Course Object
        """
        return any(
            enrollment['course_title'] == course.title
            for enrollment in serialized_enrollments
        )

    @classmethod
    def is_course_serialized_with_status(cls, serialized_enrollments, course, is_verified=True):
        """
        Helper method to test if a course is serialized with the proper verified status

        Args:
            serialized_enrollments (list): A list of serialized enrollments
            course (dashboard.models.Course): A Course Object
            is_verified (bool): Flag to indicate if the enrollment should be verified
        """
        expected_payment_status = 'Paid' if is_verified else 'Auditing'
        return any(
            enrollment['course_title'] == course.title and enrollment['payment_status'] == expected_payment_status
            for enrollment in serialized_enrollments
        )

    @classmethod
    def all_courses_serialized(cls, serialized_enrollments, courses):
        """
        Helper method to test that all given courses appear in a list of serialized enrollments

        Args:
            serialized_enrollments (list): A list of serialized enrollments
            courses (iterable): An iterable of Course objects
        """
        return all([cls.is_course_serialized(serialized_enrollments, course) for course in courses])

    @classmethod
    def verified_enroll(cls, user, course_run):
        """Helper method to create a verified enrollment for the test user in a course run"""
        return CachedEnrollmentFactory.create(user=user, course_run=course_run, verified=True)

    @classmethod
    def unverified_enroll(cls, user, course_run):
        """Helper method to create an unverified enrollment for the test user in a course run"""
        return CachedEnrollmentFactory.create(user=user, course_run=course_run, unverified=True)

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            cls.profile = profile = ProfileFactory.create()
        cls.user = profile.user
        # Create non-FA program data
        cls.non_fa_program = ProgramFactory.create()
        _, course_runs = cls.generate_course_with_runs(
            cls.non_fa_program,
            course_params=dict(title='Non FA Course 1')
        )
        cls.non_fa_enrollments = [cls.verified_enroll(cls.user, course_runs[0])]
        cls.non_fa_program_enrollment = ProgramEnrollment.objects.create(user=cls.user, program=cls.non_fa_program)
        # Create FA program data
        cls.fa_program = ProgramFactory.create(financial_aid_availability=False)
        _, course_runs = cls.generate_course_with_runs(
            cls.fa_program,
            course_params=dict(title='FA Course 1')
        )
        cls.fa_enrollments = [cls.verified_enroll(cls.user, course_runs[0])]
        cls.fa_program_enrollment = ProgramEnrollment.objects.create(user=cls.user, program=cls.fa_program)

    def test_all_courses_serialized(self):
        """
        Tests that all of user's course enrollments are serialized
        """
        for program_enrollment in (self.non_fa_program_enrollment, self.fa_program_enrollment):
            serialized_program_user = UserProgramSearchSerializer.serialize(program_enrollment)
            serialized_enrollments = serialized_program_user['courses']
            assert self.all_courses_serialized(serialized_enrollments, program_enrollment.program.course_set.all())

    def test_course_serialization_format(self):
        """
        Tests that a user's course enrollments are serialized in a specific format
        """
        for program_enrollment in (self.non_fa_program_enrollment, self.fa_program_enrollment):
            program = program_enrollment.program
            # Generate a new course run on an existing course, and create an unverified enrollment in it
            existing_course = program.course_set.first()
            new_course_run = CourseRunFactory(course=existing_course)
            self.unverified_enroll(self.user, course_run=new_course_run)
            # Generate a new course with only unverified course run enrollments
            unver_course, unver_course_runs = self.generate_course_with_runs(
                program,
                course_params=dict(title='Unverified Course'),
                course_run_count=2
            )
            for course_run in unver_course_runs:
                self.unverified_enroll(self.user, course_run=course_run)
            # Serialize the program enrollment and make sure each course is serialized properly
            serialized_program_user = UserProgramSearchSerializer.serialize(program_enrollment)
            serialized_enrollments = serialized_program_user['courses']
            assert len(serialized_enrollments) == 2
            # A course with a mix of verified and unverified course runs should be serialized as verified
            assert self.is_course_serialized_with_status(serialized_enrollments, existing_course, is_verified=True)
            # A course with a mix of all unverified course runs should be serialized as unverified
            assert self.is_course_serialized_with_status(serialized_enrollments, unver_course, is_verified=False)

    def test_other_programs_not_serialized(self):
        """
        Tests that the serialization for a ProgramEnrollment doesn't yield enrollment data for a different program
        """
        program_enrollment_to_test = self.non_fa_program_enrollment
        # We want to test serialization for a new course in the enrolled program and a different program
        programs_to_test = [program_enrollment_to_test.program, ProgramFactory.create()]
        for program in programs_to_test:
            course, course_runs = self.generate_course_with_runs(program)
            self.verified_enroll(self.user, course_run=course_runs[0])
            serialized_program_user = UserProgramSearchSerializer.serialize(program_enrollment_to_test)
            # If the new course's program is the same one we just serialized, we expect the course to be serialized.
            course_is_expected_serialized = program == program_enrollment_to_test.program
            course_is_serialized = self.is_course_serialized(serialized_program_user['courses'], course)
            assert course_is_serialized == course_is_expected_serialized

    def test_course_enrollments_serialized_unique(self):
        """
        Tests that enrollments in multiple runs of the same course won't result in multiple serializations
        """
        # Create an enrollment for a different course run of an already-enrolled course
        serialized_program_user = UserProgramSearchSerializer.serialize(self.non_fa_program_enrollment)
        serialized_count_before_addition = len(serialized_program_user['courses'])
        first_enrollment = self.non_fa_enrollments[0]
        new_course_run = CourseRunFactory.create(course=first_enrollment.course_run.course)
        self.verified_enroll(self.user, course_run=new_course_run)
        serialized_program_user = UserProgramSearchSerializer.serialize(self.non_fa_program_enrollment)
        # Number of serialized enrollments should be unaffected
        assert len(serialized_program_user['courses']) == serialized_count_before_addition

    def test_course_final_grade_serialization(self):
        """
        Tests that a user's final grades for a course run are properly serialized
        """
        # Final grades should all be None since none have been created yet
        serialized_program_user = UserProgramSearchSerializer.serialize(self.fa_program_enrollment)
        assert all(enrollment['final_grade'] is None for enrollment in serialized_program_user['courses'])
        # Add some final grades and test that their values are properly serialized
        for enrollment in self.fa_enrollments:
            FinalGradeFactory.create(user=self.user, course_run=enrollment.course_run, grade=0.8, passed=True)
        serialized_program_user = UserProgramSearchSerializer.serialize(self.fa_program_enrollment)
        assert all(enrollment['final_grade'] == 80.0 for enrollment in serialized_program_user['courses'])


class UserProgramSerializerSemesterTests(MockedESTestCase):
    """
    Test cases for the serialization of a user's semester enrollments for search results
    """

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        cls.user = profile.user
        cls.program = ProgramFactory.create()
        cls.program_enrollment = ProgramEnrollment.objects.create(user=cls.user, program=cls.program)

    @staticmethod
    def get_sorted_semester_values(serialized_program_user):
        """
        Returns a sorted list of serialized semester values
        """
        return sorted([
            serialized['semester'] for serialized in serialized_program_user['enrollments']
        ], key=lambda x: float('inf') if x is None else x)

    def test_semester_serialization(self):
        """
        Tests that each course run has a string semester value as part of its serialization
        """
        num_courses = 5
        courses = CourseFactory.create_batch(num_courses, program=self.program)
        course_runs = [CourseRunFactory.create(course=course) for course in courses]
        for course_run in course_runs:
            CachedEnrollmentFactory.create(user=self.user, course_run=course_run, verified=True)
        with patch(
            'dashboard.serializers.get_year_season_from_course_run', autospec=True, return_value=(2017, 'Spring')
        ) as get_year_season_patch:
            serialized_program_user = UserProgramSearchSerializer.serialize(self.program_enrollment)
        assert len(serialized_program_user['courses']) == num_courses
        assert all(
            semester_enrollment['semester'] == '2017 - Spring'
            for semester_enrollment in serialized_program_user['course_runs']
        )
        # multiply by two while serialize_enrollments has semester
        assert get_year_season_patch.call_count == num_courses*2

    def test_serialized_semester_value(self):
        """
        Tests that semester information in a course run is serialized to the right values
        """
        valid_semester_course_run = CourseRunFactory.build(start_date=datetime(2017, 1, 1, tzinfo=pytz.UTC))
        no_semester_course_run = CourseRunFactory.build(start_date=None, edx_course_key='bad_key')
        valid_semester_serialized = UserProgramSearchSerializer.serialize_semester(valid_semester_course_run)
        no_semester_serialized = UserProgramSearchSerializer.serialize_semester(no_semester_course_run)
        assert valid_semester_serialized == '2017 - Spring'
        assert no_semester_serialized is None


class UserProgramSerializerTests(MockedESTestCase):
    """
    Test cases for the serialization of program list to be unenrolled
    """
    def test_serializer_payload(self):
        """Test for list of programs ids serialization"""
        array = [1, 2, 3]
        payload = {
            "program_ids": array
        }
        data = UnEnrollProgramsSerializer(payload).data
        assert data == payload

    def test_serializer_empty_list(self):
        """Test for list of programs ids serialization"""
        payload = {
            "program_ids": []
        }
        data = UnEnrollProgramsSerializer(payload).data
        assert data == payload

    def test_serializer_invalid_payload(self):
        """Test for invalid list of programs ids serialization"""
        payload = {}
        with self.assertRaises(KeyError):
            __ = UnEnrollProgramsSerializer(payload).data
