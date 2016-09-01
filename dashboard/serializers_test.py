"""
Test cases for the UserProgramSerializer
"""
from django.test import TestCase
from django.db.models.signals import post_save
from factory.django import mute_signals
from profiles.factories import (
    EducationFactory,
    EmploymentFactory,
    ProfileFactory,
)
from courses.factories import (
    ProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from dashboard.factories import (
    CachedCertificateFactory,
    CachedEnrollmentFactory,
)
from dashboard.models import ProgramEnrollment
from dashboard.serializers import UserProgramSerializer


class UserProgramSerializerTests(TestCase):
    """
    Test cases for the UserProgramSerializer
    """
    @staticmethod
    def _generate_cached_enrollments(user, program, num_course_runs=1, data=None):
        """
        Helper method to generate CachedEnrollments for test cases
        """
        course = CourseFactory.create(program=program)
        course_runs = [CourseRunFactory.create(course=course) for _ in range(num_course_runs)]
        factory_kwargs = dict(user=user)
        if data is not None:
            factory_kwargs['data'] = data
        return [CachedEnrollmentFactory.create(course_run=course_run, **factory_kwargs) for course_run in course_runs]

    @classmethod
    def setUpTestData(cls):
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        EducationFactory.create(profile=profile)
        EmploymentFactory.create(profile=profile)
        program = ProgramFactory.create()
        cls.enrollments = cls._generate_cached_enrollments(profile.user, program, num_course_runs=2)
        certificate_grades = [0.7, 0.8]
        cls.certificates = []
        for i, enrollment in enumerate(cls.enrollments):
            cls.certificates.append(
                CachedCertificateFactory.create(
                    user=profile.user,
                    course_run=enrollment.course_run,
                    data={'grade': certificate_grades[i]}
                )
            )
        cls.program_enrollment = ProgramEnrollment.objects.create(user=profile.user, program=program)

    def test_full_program_user_serialization(self):
        """
        Tests that full ProgramEnrollment serialization works as expected
        """
        user = self.program_enrollment.user
        program = self.program_enrollment.program
        assert UserProgramSerializer.serialize(self.program_enrollment) == {
            'id': program.id,
            'enrollments': UserProgramSerializer.serialize_valid_edx_data(user.cachedenrollment_set, program),
            'certificates': UserProgramSerializer.serialize_valid_edx_data(user.cachedcertificate_set, program),
            'grade_average': 75
        }

    def test_cached_edx_model_serialization(self):
        """
        Tests the serialization of cached edX model objects (CachedEnrollment, CachedCertificate)
        """
        expected_serialized = {
            'enrollments': [enrollment.data for enrollment in self.enrollments],
            'certificates': [certificate.data for certificate in self.certificates]
        }
        serialized_user_program = UserProgramSerializer.serialize(self.program_enrollment)
        for key in ['enrollments', 'certificates']:
            assert len(serialized_user_program[key]) == len(expected_serialized[key])
            assert all([data in serialized_user_program[key] for data in expected_serialized[key]])

    def test_other_programs_not_serialized(self):
        """
        Tests that the serialization for a ProgramEnrollment doesn't yield enrollment data for a different program
        """
        # Create an enrollment in a different program and make sure it is not part of the serialized version
        user = self.program_enrollment.user
        enrolled_program = self.program_enrollment.program
        other_program = ProgramFactory.create()
        self._generate_cached_enrollments(user, other_program, num_course_runs=1, data={'enroll': '1'})
        serialized_program_user = UserProgramSerializer.serialize(self.program_enrollment)
        assert len([e for e in serialized_program_user['enrollments'] if e == {'enroll': '1'}]) == 0
        # Create an enrollment in the same program and make sure it is part of the serialized version
        self._generate_cached_enrollments(user, enrolled_program, num_course_runs=1, data={'enroll': '2'})
        serialized_program_user = UserProgramSerializer.serialize(self.program_enrollment)
        assert len([e for e in serialized_program_user['enrollments'] if e == {'enroll': '2'}]) == 1
