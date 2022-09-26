"""
List all users that enrolled in current or future run and paid for course and have an exam attempt
"""
from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import BaseCommand, CommandError
from django.db import models


from courses.models import CourseRun
from dashboard.api import has_to_pay_for_exam
from dashboard.models import CachedEnrollment
from dashboard.utils import get_mmtrack
from ecommerce.models import Order, Line


class Command(BaseCommand):
    """
    List all users that
        1) enrolled in a current course in current or future run
        2) paid
        3) have an exam attempt
    """
    help = "List all users that enrolled in current or future run and paid for course"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument

        future_runs = CourseRun.objects.filter(
            models.Q(edx_course_key__icontains='3T2022') | models.Q(edx_course_key__icontains='1T2023')
        )
        if not future_runs:
            raise CommandError('There are no current or future course runs')

        user_for_upgrade = []
        for course_run in future_runs:
            course = course_run.course
            program = course_run.course.program
            enrolled_user_ids = set(CachedEnrollment.get_cached_users(course_run))
            paid_enrolled_users_ids = list(Line.objects.filter(
                order__status__in=Order.FULFILLED_STATUSES,
                order__user__in=enrolled_user_ids,
                course_key__in=course.courserun_set.values('edx_course_key'),
            ).values_list('order__user', flat=True))
            paid_enrolled_users = User.objects.filter(id__in=paid_enrolled_users_ids)
            for user in paid_enrolled_users:
                mmtrack = get_mmtrack(user, program)
                has_paid = mmtrack.has_paid(course_run.edx_course_key)
                has_to_pay_exam = has_to_pay_for_exam(mmtrack, course)
                if not has_to_pay_exam and has_paid:
                    user_for_upgrade.append((user.email, course_run.edx_course_key))

        file_name = 'users_eligible_for_upgrade.csv'
        path = '{}/{}'.format(settings.BASE_DIR, file_name)
        with open(path, 'w') as f:
            for email, run_key in user_for_upgrade:
                f.write(f'{email},{run_key}\n')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {file_name}'
            )
        )
