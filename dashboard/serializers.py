"""
Provides functionality for serializing a ProgramEnrollment for the ES index
"""
from rest_framework import serializers
from courses.utils import get_year_season_from_course_run
from dashboard.utils import get_mmtrack
from roles.api import is_learner


class UserProgramSearchSerializer:
    """
    Provides functions for serializing a ProgramEnrollment for the ES index
    """
    PAID_STATUS = 'Paid'
    UNPAID_STATUS = 'Auditing'

    @classmethod
    def serialize_enrollments(cls, mmtrack):
        """
        Serializes a user's enrollment data for search results in such a way that enrollments
        in multiple runs of a single course will result in just one serialization.

        Args:
            mmtrack (MMTrack): An MMTrack object
        Returns:
            list: Serialized course enrollments
        """
        serialized_enrollments_map = {}
        for course_run in mmtrack.get_all_enrolled_course_runs():
            course_title = course_run.course.title
            # If any course run for this course was verified/paid, count it as verified
            if course_title not in serialized_enrollments_map or \
                    serialized_enrollments_map[course_title]['payment_status'] == cls.UNPAID_STATUS:
                serialized_enrollments_map[course_title] = cls.serialize_enrollment_with_semester(mmtrack, course_run)
        return list(serialized_enrollments_map.values())

    @classmethod
    def serialize_enrollment_with_semester(cls, mmtrack, course_run):
        """
        Serializes information about a user's enrollment in a course run

        Args:
            mmtrack (MMTrack): An MMTrack object
            course_run (CourseRun): An enrolled CourseRun
        Returns:
            dict: Serialized course enrollment
        """
        course_title = course_run.course.title
        has_paid = mmtrack.has_paid(course_run.edx_course_key)
        payment_status = cls.PAID_STATUS if has_paid else cls.UNPAID_STATUS

        final_grade = mmtrack.get_final_grades_for_course(course_run.course).first()
        semester = cls.serialize_semester(course_run)
        return {
            'final_grade': final_grade.grade_percent if final_grade else None,
            'semester': semester,
            'course_title': course_title,
            'payment_status': payment_status,
        }

    @classmethod
    def serialize_course_enrollments(cls, mmtrack):
        """
        Serializes a user's enrollment data for search results in such a way that enrollments
        in multiple runs of a single course will result in just one serialization.

        Args:
            mmtrack (MMTrack): An MMTrack object
        Returns:
            list: Serialized course enrollments
        """
        serialized_enrollments_map = {}
        for course_run in mmtrack.get_all_enrolled_course_runs():
            course_title = course_run.course.title
            # If any course run for this course was verified/paid, count it as verified
            if course_title not in serialized_enrollments_map or \
                    serialized_enrollments_map[course_title]['payment_status'] == cls.UNPAID_STATUS:
                serialized_enrollments_map[course_title] = cls.serialize_enrollment(mmtrack, course_run)
        return list(serialized_enrollments_map.values())

    @classmethod
    def serialize_enrollment(cls, mmtrack, course_run):
        """
        Serializes information about a user's enrollment in a course run

        Args:
            mmtrack (MMTrack): An MMTrack object
            course_run (CourseRun): An enrolled CourseRun
        Returns:
            dict: Serialized course enrollment
        """
        course_title = course_run.course.title
        has_paid = mmtrack.has_paid(course_run.edx_course_key)
        payment_status = cls.PAID_STATUS if has_paid else cls.UNPAID_STATUS

        final_grade = mmtrack.get_final_grades_for_course(course_run.course).first()
        return {
            'final_grade': final_grade.grade_percent if final_grade else None,
            'course_title': course_title,
            'payment_status': payment_status,
        }

    @classmethod
    def serialize_course_runs_enrolled(cls, mmtrack):
        """
        Serializes information about a user's semester enrollments

        Args:
            mmtrack (MMTrack): An MMTrack object
        Returns:
            list: Serialized all semester enrollments
        """
        return [
            {'semester': cls.serialize_semester(course_run)} for course_run in mmtrack.get_all_enrolled_course_runs()
        ]

    @classmethod
    def serialize_semester(cls, course_run):
        """
        Serializes the semester in which a user has been enrolled

        Args:
            course_run (CourseRun): An enrolled CourseRun
        Returns:
            str: Serialized semester enrollment or None
        """
        year_season_tuple = get_year_season_from_course_run(course_run)
        if year_season_tuple:
            return '{} - {}'.format(year_season_tuple[0], year_season_tuple[1])
        return None

    @classmethod
    def serialize(cls, program_enrollment):
        """
        Serializes a ProgramEnrollment object
        """
        user = program_enrollment.user
        program = program_enrollment.program
        mmtrack = get_mmtrack(user, program)

        return {
            'id': program.id,
            'enrollments': cls.serialize_enrollments(mmtrack),
            'courses': cls.serialize_course_enrollments(mmtrack),
            'course_runs': cls.serialize_course_runs_enrolled(mmtrack),
            'grade_average': mmtrack.calculate_final_grade_average(),
            'is_learner': is_learner(user, program),
            'num_courses_passed': mmtrack.count_courses_passed(),
            'total_courses': program.course_set.count()
        }


class UnEnrollProgramsSerializer(serializers.Serializer):
    """Serialize list of numbers"""
    program_ids = serializers.ListField(child=serializers.IntegerField())

    def get_program_ids(self):
        """return list of program ids extracted from payload"""
        self.is_valid(raise_exception=True)
        return self.data['program_ids']
