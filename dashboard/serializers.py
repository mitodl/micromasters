"""
Provides functionality for serializing a ProgramEnrollment for the ES index
"""
from decimal import Decimal

from edx_api.certificates.models import Certificate, Certificates
from edx_api.grades.models import CurrentGrade, CurrentGrades
from edx_api.enrollments.models import Enrollments

from dashboard.models import CachedEnrollment, CachedCertificate, CachedCurrentGrade
from dashboard.utils import MMTrack
from roles.models import (
    NON_LEARNERS,
    Role
)


class UserProgramSearchSerializer:
    """
    Provides functions for serializing a ProgramEnrollment for the ES index
    """
    @staticmethod
    def calculate_final_grade_average(mmtrack):
        """
        Calculates an average grade (integer) from the program final grades
        """
        final_grades = mmtrack.get_all_final_grades()
        if final_grades:
            return round(sum(Decimal(final_grade) for final_grade in final_grades.values()) / len(final_grades))

    @classmethod
    def serialize(cls, program_enrollment):
        """
        Serializes a ProgramEnrollment object
        """
        user = program_enrollment.user
        program = program_enrollment.program
        enrollments = list(CachedEnrollment.active_data(user, program))
        certificates = list(CachedCertificate.active_data(user, program))
        current_grades = list(CachedCurrentGrade.active_data(user, program))

        mmtrack = MMTrack(
            user,
            program,
            Enrollments(enrollments),
            CurrentGrades([CurrentGrade(grade) for grade in current_grades]),
            Certificates([Certificate(cert) for cert in certificates])
        )
        return {
            'id': program.id,
            'enrollments': enrollments,
            'certificates': certificates,
            'current_grades': current_grades,
            'grade_average': cls.calculate_final_grade_average(mmtrack),
            'is_learner': cls.is_learner(user, program),
            'email_optin': user.profile.email_optin,
        }

    @classmethod
    def is_learner(cls, user, program):
        """
        Returns true if user is learner or false

        Args:
            user (django.contrib.auth.models.User): A user
            program (Program): Program object
        """
        return (
            not Role.objects.filter(user=user, role__in=NON_LEARNERS, program=program).exists()
        )
