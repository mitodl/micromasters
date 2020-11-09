"""
Import proctored exam grades from edx
"""
import csv
import argparse
from django.contrib.auth.models import User

from django.core.management import BaseCommand, CommandError

from courses.models import Course
from exams.models import ExamRun, ExamAuthorization
from exams.pearson.constants import EXAM_GRADE_PASS, EXAM_GRADE_FAIL
from grades.models import ProctoredExamGrade


class Command(BaseCommand):
    """Parses a csv with exam grades creating or updating ProctoredExamGrade"""
    help = "Parses a csv with exam grades and creates ProctoredExamGrade"

    def add_arguments(self, parser):
        parser.add_argument('csvfile', type=argparse.FileType('r'), help='')

        parser.add_argument('course_code', type=argparse.FileType('r'), help='Example: 14.100')

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument,too-many-locals

        csvfile = kwargs.get('csvfile')
        course_number = kwargs.get('course_code')
        reader = csv.DictReader(csvfile.read().splitlines())

        try:
            course = Course.objects.get(course_number__startswith=course_number)
        except Course.DoesNotExist:
            raise CommandError(
                'Could not find a course with number "{}"'.format(course_number)
            )
        except Course.MultipleObjectsReturned:
            raise CommandError(
                'There are multiple courses with given number "{}"'.format(course_number)
            )
        # should be only one current exam run
        exam_run = ExamRun.get_currently_schedulable(course).first()

        if exam_run is None:
            raise CommandError(
                'There are no eligible exam runs for course "{}"'.format(course.title)
            )

        grade_count = 0
        existing_grades = 0
        for row in reader:
            user = User.objects.get(username=row['Username'])
            exam_authorization = ExamAuthorization.objects.get(user=user, exam_run=exam_run)
            passed = row['Grade'] >= exam_run.passing_score
            defaults = {
                'passing_score': exam_run.passing_score,
                'score': row['Grade']*100,
                'grade': EXAM_GRADE_PASS if passed else EXAM_GRADE_FAIL,
                'percentage_grade': float(row['Grade']),
                'passed': passed,
                'row_data': row,
            }
            exam_grade, updated = ProctoredExamGrade.objects.update_or_create(
                user=user,
                course=course,
                exam_run=exam_run,
                defaults=defaults
            )
            if updated:
                existing_grades += 1
            else:
                grade_count += 1
                exam_authorization.exam_taken = True
                exam_authorization.save()

        result_messages = [
            'Total exam grades created: {}'.format(grade_count),
            'Total number of modified grades: {}'.format(existing_grades)
        ]

        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))
