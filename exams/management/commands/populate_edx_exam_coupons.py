"""
Populates ExamAuthorizations with edx coupon urls for taking exam-course
"""
import csv
import argparse
import re
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

        exam_runs = ExamRun.get_currently_schedulable(course)

        if not exam_runs.exists():
            raise CommandError(
                'There are no eligible exam runs for course "{}"'.format(course.title)
            )

        exam_auths = ExamAuthorization.objects.filter(
            exam_run__in=exam_runs,
            status=ExamAuthorization.STATUS_SUCCESS,
            exam_coupon_url__isnull=True
        )
        if exam_auths.count() > len(validated_urls):
            raise CommandError(
                'Not enough coupon codes for course_number "{}", '
                'number of coupons:{}, authorizations: {}'.format(
                    course_number,
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
