"""
List all users paid, have exam attempt, not enrolled
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import BaseCommand
from django.db import models

from backends.constants import BACKEND_MITX_ONLINE
from courses.models import Course, CourseRun
from dashboard.api import has_to_pay_for_exam
from dashboard.models import CachedEnrollment
from dashboard.utils import get_mmtrack
from ecommerce.models import Line, Order
from profiles.api import get_social_username

User = get_user_model()


class Command(BaseCommand):
    """
    List all users that paid for course and did not use their exam attempt, independently
    of having passed the course or not. Also, they are not currently enrolled for that course.

    The output file format: <mitxonline username>, <email>, <edx_course_key>
    """
    help = "List all users paid, have exam attempt, not enrolled"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument

        final_list = []
        courses = Course.objects.filter(program__title__icontains="Data, Economics")
        for course in courses:
            next_course_run = CourseRun.objects.filter(
                models.Q(edx_course_key__icontains='3T2022') | models.Q(edx_course_key__icontains='1T2023') | models.Q(
                    edx_course_key__icontains='2T2023')
            ).filter(course=course).filter(is_discontinued=False).order_by("start_date").first()
            if next_course_run is None:
                self.stdout.write(
                    self.style.ERROR(
                        f"course id {course.id} has no current/future course runs"
                    )
                )
                continue
            enrolled_user_ids = set(CachedEnrollment.get_cached_users(next_course_run))
            paid_not_enrolled_users_ids = list(Line.objects.filter(
                order__status__in=Order.FULFILLED_STATUSES,
                course_key__in=course.courserun_set.values('edx_course_key'),
            ).exclude(order__user__in=enrolled_user_ids).values_list('order__user', flat=True))
            paid_not_enrolled_users = User.objects.filter(id__in=paid_not_enrolled_users_ids)
            for user in paid_not_enrolled_users:
                mmtrack = get_mmtrack(user, course.program)
                if not has_to_pay_for_exam(mmtrack, course):
                    username = get_social_username(user, BACKEND_MITX_ONLINE)
                    final_list.append((username, user.email, next_course_run.edx_course_key))

        file_name = 'paid_users.csv'
        path = f'{settings.BASE_DIR}/{file_name}'
        with open(path, 'w', encoding='utf-8') as f:
            for username, email, course_id in final_list:
                f.write(f'{username},{email},{course_id}\n')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {file_name}'
            )
        )
