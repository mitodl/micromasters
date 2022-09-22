"""
List all users authorized for current exam run
"""
import datetime
from django.conf import settings
from django.core.management import BaseCommand, CommandError
from django.db import models


from courses.models import CourseRun
from dashboard.models import CachedEnrollment
from exams.models import ExamRun, ExamAuthorization
from micromasters.utils import now_in_utc


class Command(BaseCommand):
    """
    List all users authorized for current exam run and did not use it, also
    make sure they are not enrolled in future runs
    """
    help = "List all users authorized for current exam run"

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument

        two_months = datetime.timedelta(weeks=8)
        # get most recent exam runs
        exam_runs = list(ExamRun.objects.filter(
            date_first_schedulable__gte=now_in_utc()-two_months,
        ).values_list('id', flat=True))
        if exam_runs is None:
            raise CommandError('There are no exam runs that were schedulable within the last two months')

        course_runs = CourseRun.objects.filter(
            models.Q(edx_course_key__contains='3T2022') | models.Q(edx_course_key__contains='1T2023')
        )
        final_list = []
        for course_run in course_runs:
            enrolled_user_ids = set(CachedEnrollment.get_cached_users(course_run))
            exam_auths = ExamAuthorization.objects.filter(
                exam_run__in=exam_runs,
                course=course_run.course,
                exam_taken=False
            ).exclude(user__in=enrolled_user_ids).values_list('user__email', flat=True)
            if exam_auths:
                [final_list.append((auth_email, course_run.course_id)) for auth_email in exam_auths]
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




