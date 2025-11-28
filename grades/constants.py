"""
Constants for the grades app
"""
import datetime

import pytz

COURSE_GRADE_WEIGHT = 0.4
EXAM_GRADE_WEIGHT = 0.6

NEW_COMBINED_FINAL_GRADES_DATE = datetime.datetime(2022, 9, 1, tzinfo=pytz.UTC)


class FinalGradeStatus:
    """
    Possible statuses for the Final Grades
    """
    PENDING = 'pending'
    COMPLETE = 'complete'
    ALL_STATUSES = [PENDING, COMPLETE]
