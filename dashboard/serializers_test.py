"""
Test cases for the UserProgramSearchSerializer
"""
import ddt
import faker
import pytz
from django.test import TestCase
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import (
    ProgramFactory,
    CourseFactory,
    CourseRunFactory,
)
from dashboard.factories import (
    CachedCertificateFactory,
    CachedCurrentGradeFactory,
    CachedEnrollmentFactory,
)
from dashboard.models import (
    CachedCertificate,
    CachedCurrentGrade,
    CachedEnrollment,
    ProgramEnrollment,
)
from dashboard.serializers import UserProgramSearchSerializer
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
from profiles.models import Profile
from roles.models import Role
from roles.roles import Staff


@ddt.ddt
class UserProgramSearchSerializerTests(TestCase):
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
        cours_run_params = dict(before_now=True, after_now=False, tzinfo=pytz.utc)
        course_runs = [
            CourseRunFactory.create(
                course=course,
                enrollment_start=fake.date_time_this_month(**cours_run_params),
                start_date=fake.date_time_this_month(**cours_run_params),
                enrollment_end=fake.date_time_this_month(**cours_run_params),
                end_date=fake.date_time_this_year(**cours_run_params),
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

    def test_full_program_user_serialization(self):
        """
        Tests that full ProgramEnrollment serialization works as expected
        """
        Profile.objects.filter(pk=self.profile.pk).update(email_optin=True)
        self.profile.refresh_from_db()
        program = self.program_enrollment.program
        assert UserProgramSearchSerializer.serialize(self.program_enrollment) == {
            'id': program.id,
            'enrollments': list(CachedEnrollment.active_data(self.user, program)),
            'certificates': list(CachedCertificate.active_data(self.user, program)),
            'current_grades': list(CachedCurrentGrade.active_data(self.user, program)),
            'grade_average': 75,
            'is_learner': True,
            'email_optin': True
        }

    @ddt.data(False, True)
    def test_full_program_user_serialization_email_optin_changes(self, email_optin_flag):
        """
        Tests that full ProgramEnrollment serialization works as expected on email_optin changes.
        """
        Profile.objects.filter(pk=self.profile.pk).update(email_optin=email_optin_flag)
        self.profile.refresh_from_db()
        program = self.program_enrollment.program
        assert UserProgramSearchSerializer.serialize(self.program_enrollment) == {
            'id': program.id,
            'enrollments': list(CachedEnrollment.active_data(self.user, program)),
            'certificates': list(CachedCertificate.active_data(self.user, program)),
            'current_grades': list(CachedCurrentGrade.active_data(self.user, program)),
            'grade_average': 75,
            'is_learner': True,
            'email_optin': email_optin_flag
        }

    def test_full_program_user_serialization_financial_aid(self):
        """
        Tests that full ProgramEnrollment serialization works as expected
        for financial aid programs.
        the difference with test_full_program_user_serialization
        is that the grade is calculated using the current grades
        """
        Profile.objects.filter(pk=self.profile.pk).update(email_optin=True)
        self.profile.refresh_from_db()
        expected_result = {
            'id': self.fa_program.id,
            'enrollments': list(CachedEnrollment.active_data(self.user, self.fa_program)),
            'certificates': [],
            'current_grades': list(CachedCurrentGrade.active_data(self.user, self.fa_program)),
            'grade_average': 95,
            'is_learner': True,
            'email_optin': True
        }
        assert UserProgramSearchSerializer.serialize(self.fa_program_enrollment) == expected_result

    def test_full_program_user_serialization_staff(self):
        """
        Tests that when user has staff role, the serialization shows that she is not a learner.
        """
        Profile.objects.filter(pk=self.profile.pk).update(email_optin=True)
        self.profile.refresh_from_db()
        program = self.program_enrollment.program
        Role.objects.create(
            user=self.user,
            program=program,
            role=Staff.ROLE_ID
        )

        assert UserProgramSearchSerializer.serialize(self.program_enrollment) == {
            'id': program.id,
            'enrollments': list(CachedEnrollment.active_data(self.user, program)),
            'certificates': list(CachedCertificate.active_data(self.user, program)),
            'current_grades': list(CachedCurrentGrade.active_data(self.user, program)),
            'grade_average': 75,
            'is_learner': False,
            'email_optin': True
        }

    def test_cached_edx_model_serialization(self):
        """
        Tests the serialization of cached edX model objects (CachedEnrollment, CachedCertificate)
        """
        expected_serialized = {
            'enrollments': [enrollment.data for enrollment in self.enrollments],
            'certificates': [certificate.data for certificate in self.certificates]
        }
        serialized_user_program = UserProgramSearchSerializer.serialize(self.program_enrollment)
        for key in ['enrollments', 'certificates']:
            assert len(serialized_user_program[key]) == len(expected_serialized[key])
            assert all([data in serialized_user_program[key] for data in expected_serialized[key]])

    def test_other_programs_not_serialized(self):
        """
        Tests that the serialization for a ProgramEnrollment doesn't yield enrollment data for a different program
        """
        # Create an enrollment in a different program and make sure it is not part of the serialized version
        enrolled_program = self.program_enrollment.program
        other_program = ProgramFactory.create()
        self._generate_cached_enrollments(self.user, other_program, num_course_runs=1, data={'enroll': '1'})
        serialized_program_user = UserProgramSearchSerializer.serialize(self.program_enrollment)
        assert len([e for e in serialized_program_user['enrollments'] if e == {'enroll': '1'}]) == 0
        # Create an enrollment in the same program and make sure it is part of the serialized version
        self._generate_cached_enrollments(self.user, enrolled_program, num_course_runs=1, data={'enroll': '2'})
        serialized_program_user = UserProgramSearchSerializer.serialize(self.program_enrollment)
        assert len([e for e in serialized_program_user['enrollments'] if e == {'enroll': '2'}]) == 1
