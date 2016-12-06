"""
Provides functionality for serializing a ProgramEnrollment for the ES index
"""
from decimal import Decimal

from dashboard.api_edx_cache import CachedEdxUserData
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
        edx_user_data = CachedEdxUserData(user, program=program, include_raw_data=True)

        mmtrack = MMTrack(
            user,
            program,
            edx_user_data
        )
        return {
            'id': program.id,
            'enrollments': edx_user_data.raw_enrollments,
            'certificates': edx_user_data.raw_certificates,
            'current_grades': edx_user_data.raw_current_grades,
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
