"""
List all users authorized for current exam run
"""
import datetime
from django.conf import settings
from django.core.management import BaseCommand, CommandError
from django.db import models


from courses.models import CourseRun, Course
from dashboard.models import CachedEnrollment
from exams.models import ExamRun, ExamAuthorization


class Command(BaseCommand):
    """
    List all users authorized for current exam run and did not use it, also
    make sure they are not enrolled in future runs
    """
    help = "List all users authorized for current exam run"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument

        final_list = []
        courses = Course.objects.filter(program__title__icontains="Data, Economics")
        for course in courses:
            exam_run = ExamRun.objects.filter(course=course).order_by("-date_last_schedulable").first()
            course_run = CourseRun.objects.filter(
                models.Q(edx_course_key__icontains='3T2022') | models.Q(edx_course_key__icontains='1T2023') | models.Q(
                    edx_course_key__icontains='2T2023')
            ).filter(course=course).filter(is_discontinued=False).order_by("start_date").first()
            if course_run is None:
                self.stdout.write(
                    self.style.ERROR(
                        f"course id {course.id} has no current/future course runs"
                    )
                )
                continue
            if exam_run is None:
                self.stdout.write(
                    self.style.ERROR(
                        f"course id {course.id} has no exam runs"
                    )
                )
                continue

            enrolled_user_ids = set(CachedEnrollment.get_cached_users(course_run))
            exam_auths = ExamAuthorization.objects.filter(
                exam_run=exam_run,
                course=course,
                exam_taken=False
            ).exclude(user__in=enrolled_user_ids).values_list('user__email', flat=True)
            if exam_auths:
                [final_list.append((auth_email, course.id)) for auth_email in exam_auths]

        file_name = 'authorized_users.csv'
        path = '{}/{}'.format(settings.BASE_DIR, file_name)
        with open(path, 'w') as f:
            for email, course_id in final_list:
                f.write(f'{email},{course_id}\n')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {file_name}'
            )
        )




