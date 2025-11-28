"""
Import proctored exam grades from edx
"""
import argparse
import csv

from django.core.management import BaseCommand, CommandError
from social_django.models import UserSocialAuth

from courses.models import Course
from exams.constants import BACKEND_MITX_ONLINE, EXAM_GRADE_PASS
from exams.models import ExamAuthorization, ExamRun
from grades.models import ProctoredExamGrade
from micromasters.utils import now_in_utc


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
            try:
                user_social_auth = UserSocialAuth.objects.get(uid=row['username'], provider=BACKEND_MITX_ONLINE)
            except UserSocialAuth.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Could not find social auth for user for username {row['username']}")
                )
                continue
            user = user_social_auth.user
            course_id = row['course_id']

            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                raise CommandError(
                    f'Could not find a course with number "{course_id}"'
                )
            # should pick the latest past exam run
            now = now_in_utc()
            exam_run = ExamRun.objects.filter(
                course=course,
                date_first_schedulable__lte=now
            ).order_by('-date_last_schedulable').first()
            if exam_run is None:
                raise CommandError(
                    f'There are no eligible exam runs for course "{course.title}"'
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
            f'Total exam grades created: {grade_count}',
            f'Total number of modified grades: {existing_grades}'
        ]

        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))
