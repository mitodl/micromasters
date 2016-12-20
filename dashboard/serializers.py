"""
Provides functionality for serializing a ProgramEnrollment for the ES index
"""
from dashboard.api_edx_cache import CachedEdxUserData
from dashboard.models import CachedEnrollment
from dashboard.utils import MMTrack
from roles.api import is_learner


class UserProgramSearchSerializer:
    """
    Provides functions for serializing a ProgramEnrollment for the ES index
    """
    @classmethod
    def serialize_enrollments(cls, mmtrack, enrollments):
        """
        Serializes a user's enrollment data for search results

        Args:
            mmtrack (MMTrack): An MMTrack object
            enrollments (iterable): An iterable of CachedEnrollments
        Returns:
            list: Serialized courses
        """
        enrollment_status_map = {}
        for enrollment in enrollments:
            course_title = enrollment.course_run.course.title
            is_verified = mmtrack.is_enrolled_mmtrack(enrollment.course_run.edx_course_key)
            # If any course run for this course was verified/paid, maintain the verified status
            enrollment_status_map[course_title] = enrollment_status_map.get(course_title) or is_verified
        serialized_enrollments = []
        for course_title, is_verified in enrollment_status_map.items():
            enrollment_status = 'Paid' if is_verified else 'Auditing'
            serialized_enrollments.extend([
                {'level': 1, 'value': course_title, 'ancestors': []},
                {'level': 2, 'value': enrollment_status, 'ancestors': [course_title]}
            ])
        return serialized_enrollments

    @classmethod
    def serialize(cls, program_enrollment):
        """
        Serializes a ProgramEnrollment object
        """
        user = program_enrollment.user
        program = program_enrollment.program
        edx_user_data = CachedEdxUserData(user, program=program)

        mmtrack = MMTrack(
            user,
            program,
            edx_user_data
        )
        enrollments_qset = CachedEnrollment.user_course_qset(user, program=program)

        return {
            'id': program.id,
            'enrollments': cls.serialize_enrollments(mmtrack, enrollments_qset),
            'grade_average': mmtrack.calculate_final_grade_average(),
            'is_learner': is_learner(user, program),
            'email_optin': user.profile.email_optin,
            'num_courses_passed': mmtrack.count_courses_passed(),
            'total_courses': program.course_set.count()
        }
