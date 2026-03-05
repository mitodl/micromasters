"""
Checks the freeze status for a final grade
"""
from celery.result import GroupResult
from django.core.cache import caches
from django.core.management import BaseCommand, CommandError
from django_redis import get_redis_connection

from courses.models import CourseRun
from dashboard.models import CachedCurrentGrade, CachedEnrollment
from grades.api import CACHE_KEY_FAILED_USERS_BASE_STR
from grades.models import CourseRunGradingStatus, FinalGrade
from grades.tasks import CACHE_ID_BASE_STR
from micromasters.celery import app

cache_redis = caches['redis']


class Command(BaseCommand):
    """
    Checks the status of the final grade freeze for
    """
    help = "Submits a celery task to freeze the final grades for all the users enrolled in a course run"

    def add_arguments(self, parser):
        parser.add_argument("edx_course_key", help="the edx_course_key for the course run")

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        edx_course_key = kwargs.get('edx_course_key')
        try:
            run = CourseRun.objects.get(edx_course_key=edx_course_key)
        except CourseRun.DoesNotExist:
            raise CommandError(f'Course Run for course_id "{edx_course_key}" does not exist')

        con = get_redis_connection("redis")
        failed_users_count = con.llen(CACHE_KEY_FAILED_USERS_BASE_STR.format(edx_course_key))

        if CourseRunGradingStatus.is_complete(run):
            self.stdout.write(
                self.style.SUCCESS(
                    f'Final grades for course "{edx_course_key}" are complete'
                )
            )
        elif CourseRunGradingStatus.is_pending(run):
            cache_id = CACHE_ID_BASE_STR.format(edx_course_key)
            group_results_id = cache_redis.get(cache_id)
            if group_results_id is not None:
                results = GroupResult.restore(group_results_id, app=app)
                if not results.ready():
                    self.stdout.write(
                        self.style.WARNING(
                            f'Final grades for course "{edx_course_key}" are being processed'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            'Async task to freeze grade for course "{}" '
                            'are done, but course is not marked as complete.'.format(edx_course_key)
                        )
                    )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        'Final grades for course "{}" are marked as they are being processed'
                        ', but no task found.'.format(edx_course_key)
                    )
                )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Final grades for course "{edx_course_key}" are not being processed yet'
                )
            )
        message_detail = f', where {failed_users_count} failed authentication' if failed_users_count else ''
        users_in_cache = set(CachedEnrollment.get_cached_users(run)).intersection(
            set(CachedCurrentGrade.get_cached_users(run))
        )
        self.stdout.write(
            self.style.SUCCESS(
                'The students with a final grade are {}/{}{}'.format(
                    FinalGrade.objects.filter(course_run=run).count(),
                    len(users_in_cache),
                    message_detail
                )
            )
        )
