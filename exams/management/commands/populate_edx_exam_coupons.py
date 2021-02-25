"""
Populates ExamAuthorizations with edx coupon urls for taking exam-course
"""
import csv
import argparse
import pytz
import re
from django.core.management import BaseCommand, CommandError
from django.core.validators import URLValidator

from courses.models import Course
from exams.models import ExamRunCoupon


def validate_urls(reader):
    """Goes through all rows of coupons info and makes sure it is valid"""
    validator = URLValidator()
    parsed_rows = []
    for row in reader:
        validator(row['URL'])
        parsed_rows.append((row['Code'], row['URL']))
    return parsed_rows


class Command(BaseCommand):
    """Parses a csv with exam coupon url information and saves the url in ExamRunCoupon"""
    help = "Parses a csv with exam coupon url information and saves the url in ExamRunCoupon"

    def add_arguments(self, parser):
        parser.add_argument('csvfile', type=argparse.FileType('r'), help='')

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument,too-many-locals

        csvfile = kwargs.get('csvfile')
        reader = csv.DictReader(csvfile.read().splitlines())
        first_row = next(reader)
        catalog_query = first_row['Catalog Query']
        course_number = re.search(r"\+([A-Za-z0-9.]+)PEx", catalog_query).group(1)
        edx_exam_course_key = re.search(r"key:\(([A-Za-z0-9+.]+)", catalog_query).group(1)

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
        from datetime import datetime
        without_timezone = datetime.strptime(first_row['Coupon Expiry Date'], '%b %d, %y')
        timezone = pytz.timezone("UTC")
        datetime_object = timezone.localize(without_timezone)
        coupons_created = 0
        for code, url in validated_urls:
            _, created = ExamRunCoupon.objects.get_or_create(
                edx_exam_course_key=edx_exam_course_key,
                course=course,
                expiration_date=datetime_object,
                coupon_code=code,
                coupon_url=url
            )
            if created:
                coupons_created += 1

        result_messages = [
            'Total coupons in the file: {}'.format(len(validated_urls)),
            'ExamRunCoupons created: {}'.format(coupons_created),
        ]

        self.stdout.write(self.style.SUCCESS('\n'.join(result_messages)))
