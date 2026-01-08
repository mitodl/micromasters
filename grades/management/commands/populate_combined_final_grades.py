"""
Find all passed exam grades and create CombinedFinalGrade if needed
"""
from django.core.management import BaseCommand

from courses.models import Course
from grades.api import update_or_create_combined_final_grade
from grades.models import ProctoredExamGrade
from micromasters.utils import now_in_utc


class Command(BaseCommand):
    """
    Finds all passing exam grades for courses that have frozen runs
    and creates CombinedFinalGrade records
    """
    help = "Finds all users that might need a CombinedFinalGrade"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        courses = Course.objects.filter(
            program__live=True
        )
        for course in courses:
            if course.has_frozen_runs() and course.has_exam:
                exam_grades = ProctoredExamGrade.objects.filter(
                    course=course,
                    passed=True,
                    exam_run__date_grades_available__lte=now_in_utc()
                )
                for exam_grade in exam_grades:
                    update_or_create_combined_final_grade(exam_grade.user, course)
