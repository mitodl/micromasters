"""
Import proctored exam grades from edx
"""
import csv
import argparse
from django.contrib.auth.models import User

from django.core.management import BaseCommand, CommandError

from courses.models import Course
from exams.models import ExamRun, ExamAuthorization
from exams.constants import EXAM_GRADE_PASS
from grades.models import ProctoredExamGrade
from micromasters.utils import now_in_utc
from social_django.models import UserSocialAuth


class Command(BaseCommand):
    """Parses a csv with exam grades creating or updating ProctoredExamGrade"""
    help = "Parses a csv with exam grades and creates ProctoredExamGrade"

    def add_arguments(self, parser):
        parser.add_argument('csvfile', type=argparse.FileType('r'), help='')

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument,too-many-locals

        csvfile = kwargs.get('csvfile')
        reader = csv.DictReader(csvfile)

        grade_count = 0
        existing_grades = 0
        for row in reader:
            user_social_auth = UserSocialAuth.objects.filter(uid=row['username'], provider='mitxonline')
            if user_social_auth.exists():
                user = user_social_auth.user
            else:
                self.stdout.write(
                    self.style.ERROR('Could not find user for username {}'.format(row['username']))
                )
                continue

            course_id = row['course_id']

            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                raise CommandError(
                    'Could not find a course with number "{}"'.format(course_id)
                )
            # should pick the latest past exam run
            now = now_in_utc()
            exam_run = ExamRun.objects.filter(
                course=course,
                date_first_schedulable__lte=now
            ).order_by('-date_last_schedulable').first()
            if exam_run is None:
                raise CommandError(
                    'There are no eligible exam runs for course "{}"'.format(course.title)
                )
            try:
                exam_authorization = ExamAuthorization.objects.get(user=user, exam_run=exam_run)
            except ExamAuthorization.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR('Could not find authorization for user {} and exam run {}'.format(
                        user.username,
                        exam_run.id
                    ))
                )
                continue

            if int(row['no_show']):
                exam_authorization.exam_taken = True
                exam_authorization.exam_no_show = True
                exam_authorization.save()
            else:
                try:
                    score = float(row['score'])
                except ValueError:
                    self.stdout.write(
                        self.style.ERROR('Failed to create grade: empty score for user {} and exam run {}'.format(
                            user.username,
                            exam_run.id
                        ))
                    )
                    continue

                defaults = {
                    'passing_score': exam_run.passing_score,
                    'score': score,
                    'grade': row['grade'],
                    'percentage_grade': score / 100.0 if score else 0,
                    'passed': row['grade'].lower() == EXAM_GRADE_PASS,
                    'row_data': row,
                    'exam_date': now_in_utc()
                }
                _, created = ProctoredExamGrade.objects.update_or_create(
                    user=user,
                    course=course,
                    exam_run=exam_run,
                    defaults=defaults
                )
                if created:
                    grade_count += 1
                    exam_authorization.exam_taken = True
                    exam_authorization.save()
                else:
                    existing_grades += 1

        result_messages = [
            'Total exam grades created: {}'.format(grade_count),
            'Total number of modified grades: {}'.format(existing_grades)
        ]

        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))
