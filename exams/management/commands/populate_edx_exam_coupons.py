"""
Populates ExamAuthorizations with edx coupon urls for taking exam-course
"""
import csv
import argparse
from django.core.management import BaseCommand, CommandError
from django.core.validators import URLValidator

from courses.models import Course
from exams.models import ExamAuthorization, ExamRun


def validate_urls(reader):
    """Goes through all rows of coupons info and makes sure it is valid"""

    validator = URLValidator()
    parsed_rows = []
    for row in reader:
        validator(row['URL'])
        parsed_rows.append(row['URL'])
    return parsed_rows


class Command(BaseCommand):
    """Parses a csv with exam coupon url information and saves the url in ExamAuthorization"""
    help = "Parses a csv with exam coupon url information and saves the url in ExamAuthorization"

    def add_arguments(self, parser):
        parser.add_argument('csvfile', type=argparse.FileType('r'), help='')

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument,too-many-locals

        csvfile = kwargs.get('csvfile')
        reader = csv.DictReader(csvfile.read().splitlines())
        edx_course_key = next(reader)['Course ID']

        validated_urls = validate_urls(reader)
        course = Course.objects.get(courserun__edx_course_key=edx_course_key)

        exam_runs = ExamRun.get_currently_schedulable(course)

        if not exam_runs.exists():
            raise CommandError(
                'There are no eligible exam runs for course_id "{}"'.format(edx_course_key)
            )

        exam_auths = ExamAuthorization.objects.filter(
            exam_run__in=exam_runs,
            status=ExamAuthorization.STATUS_SUCCESS,
            exam_coupon_url__isnull=True
        )
        if exam_auths.count() > len(validated_urls):
            raise CommandError(
                'Not enough coupon codes for course_id "{}", '
                'number of coupons:{}, authorizations: {}'.format(
                    edx_course_key,
                    len(validated_urls),
                    exam_auths.count()
                )
            )
        auths_changed = 0
        for exam_auth, url in zip(exam_auths, validated_urls):
            exam_auth.exam_coupon_url = url
            exam_auth.save()
            auths_changed += 1

        result_messages = [
            'Total coupons: {}'.format(len(validated_urls)),
            'Authorizations changed: {}'.format(auths_changed)
        ]

        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))
