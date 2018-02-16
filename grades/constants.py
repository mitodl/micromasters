"""
Constants for the grades app
"""

COURSE_GRADE_WEIGHT = 0.4
EXAM_GRADE_WEIGHT = 0.6


class FinalGradeStatus:
    """
    Possible statuses for the Final Grades
    """
    PENDING = 'pending'
    COMPLETE = 'complete'
    ALL_STATUSES = [PENDING, COMPLETE]
