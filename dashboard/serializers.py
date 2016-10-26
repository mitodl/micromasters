"""
Provides functionality for serializing a ProgramEnrollment for the ES index
"""
from decimal import Decimal

from roles.models import (
    NON_LEARNERS,
    Role
)


class UserProgramSerializer:
    """
    Provides functions for serializing a ProgramEnrollment for the ES index
    """
    @staticmethod
    def calculate_certificate_grade_average(certificates):
        """
        Calculates an average grade (integer) from a list of certificates with <1 decimal grades
        """
        return None if len(certificates) == 0 else round(
            (sum((Decimal(certificate['grade']) for certificate in certificates)) / len(certificates)) * 100
        )

    @classmethod
    def serialize_valid_edx_data(cls, related_edx_obj_set, program):
        """
        Args:
            related_edx_obj_set (RelatedManager): RelatedManager for set of cached edX model objects
                (eg: CachedEnrollment)
            program (Program): Program object

        Returns:
            list of dict: List of serialized objects
        """
        return [
            edx_obj.data for edx_obj in related_edx_obj_set.filter(
                course_run__course__program=program
            ).exclude(data__isnull=True)
        ]

    @classmethod
    def serialize(cls, program_enrollment):
        """
        Serializes a ProgramEnrollment object
        """
        user = program_enrollment.user
        program = program_enrollment.program
        program_cached_enrollments = cls.serialize_valid_edx_data(user.cachedenrollment_set, program)
        program_cached_certificates = cls.serialize_valid_edx_data(user.cachedcertificate_set, program)
        return {
            'id': program.id,
            'enrollments': program_cached_enrollments,
            'certificates': program_cached_certificates,
            'grade_average': cls.calculate_certificate_grade_average(program_cached_certificates),
            'is_learner': cls.is_learner(user, program)
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
