"""
Import proctored exam grades from edx
"""
import csv
import argparse
from django.contrib.auth.models import User

from django.core.management import BaseCommand, CommandError

from courses.models import Course
from exams.models import ExamRun
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
        exam_runs = ExamRun.get_currently_schedulable(course)

        if not exam_runs.exists():
            raise CommandError(
                'There are no eligible exam runs for course "{}"'.format(course.title)
            )

        grade_count = 0
        existing_grades = 0
        for row in reader:
            user = User.objects.get(username=row['Username'])
            exam_grade, created = ProctoredExamGrade.objects.get_or_create(
                user=user,
                course=course,
                exam_run=exam_runs.first(),
            )
            if created:
                grade_count += 1
            else:
                existing_grades += 1
            exam_grade.set_score(row['Grade'])
            exam_grade.save_and_log(None)

        result_messages = [
            'Total exam grades created: {}'.format(grade_count),
            'Total number of modified grades: {}'.format(existing_grades)
        ]

        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))
