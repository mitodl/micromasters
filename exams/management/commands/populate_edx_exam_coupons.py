"""
Populates ExamAuthorizations with edx coupon urls for taking exam-course
"""
import csv
import argparse
import re
from django.core.management import BaseCommand, CommandError
from django.core.validators import URLValidator

from courses.models import Course
from exams.models import ExamRun, ExamRunCoupon
from micromasters.utils import now_in_utc


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
        reader = csv.DictReader(csvfile)
        catalog_query = next(reader)['Catalog Query']
        course_number = re.search(r"\+([A-Za-z0-9.]+)PEx", catalog_query).group(1)

        validated_urls = validate_urls(reader)

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
        now = now_in_utc()
        try:
            exam_run = ExamRun.objects.get(
                course=course,
                date_first_schedulable__lte=now,
                date_last_schedulable__gte=now,
            )
        except Course.DoesNotExist:
            raise CommandError(
                'There is no eligible exam run for course "{}"'.format(course_number)
            )
        except Course.MultipleObjectsReturned:
            raise CommandError(
                'There are multiple eligible exam runs for course "{}"'.format(course_number)
            )
        coupons_created = 0
        for url in validated_urls:
            _, created = ExamRunCoupon.objects.get_or_create(
                exam_run=exam_run,
                exam_coupon_url=url
            )
            if created:
                coupons_created += 1

        result_messages = [
            'Total coupons in the file: {}'.format(len(validated_urls)),
            'ExamRunCoupons created: {}'.format(coupons_created),
            'Total coupons: {}'.format(ExamRunCoupon.objects.filter(exam_run=exam_run).count()),
        ]

        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))
