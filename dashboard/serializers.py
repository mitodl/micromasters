"""
Provides functionality for serializing a ProgramEnrollment for the ES index
"""
from courses.utils import get_year_season_from_course_run
from dashboard.models import CachedEnrollment
from dashboard.utils import get_mmtrack
from roles.api import is_learner
from grades.models import FinalGrade


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
    def serialize_final_grades(cls, mmtrack, enrollments):
        """
        Serializes a user's final grades

        Args:
            mmtrack (MMTrack): An MMTrack object
            enrollments (iterable): An iterable of CachedEnrollments
        Returns:
            list: Serialized final grades
        """
        final_grades = []
        for enrollment in enrollments:
            try:
                final_grade = mmtrack.get_final_grade(enrollment.course_run.edx_course_key)
            except FinalGrade.DoesNotExist:
                continue
            if final_grade:
                final_grades.append({'title': enrollment.course_run.course.title, 'grade': final_grade})
        return final_grades

    @classmethod
    def serialize_semester_enrollments(cls, enrollments):
        """
        Serializes the semesters that a user is enrolled in

        Args:
            enrollments (iterable): An iterable of CachedEnrollments
        Returns:
            list: Serialized semester enrollments
        """
        semester_values = set()
        for enrollment in enrollments:
            year_season_tuple = get_year_season_from_course_run(enrollment.course_run)
            if year_season_tuple:
                semester_values.add(
                    '{} - {}'.format(year_season_tuple[0], year_season_tuple[1])
                )
        return [{'semester': semester_value} for semester_value in semester_values]

    @classmethod
    def serialize(cls, program_enrollment):
        """
        Serializes a ProgramEnrollment object
        """
        user = program_enrollment.user
        program = program_enrollment.program
        mmtrack = get_mmtrack(user, program)
        enrollments_qset = CachedEnrollment.user_course_qset(user, program=program)

        return {
            'id': program.id,
            'enrollments': cls.serialize_enrollments(mmtrack, enrollments_qset),
            'final_grades': cls.serialize_final_grades(mmtrack, enrollments_qset),
            'semester_enrollments': cls.serialize_semester_enrollments(enrollments_qset),
            'grade_average': mmtrack.calculate_final_grade_average(),
            'is_learner': is_learner(user, program),
            'num_courses_passed': mmtrack.count_courses_passed(),
            'total_courses': program.course_set.count()
        }
