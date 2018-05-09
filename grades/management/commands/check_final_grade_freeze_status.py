"""
Checks the freeze status for a final grade
"""
from celery.result import GroupResult
from django.core.cache import caches
from django.core.management import BaseCommand, CommandError
from django_redis import get_redis_connection

from courses.models import CourseRun
from dashboard.models import CachedEnrollment, CachedCurrentGrade
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
            raise CommandError('Course Run for course_id "{0}" does not exist'.format(edx_course_key))

        con = get_redis_connection("redis")
        failed_users_count = con.llen(CACHE_KEY_FAILED_USERS_BASE_STR.format(edx_course_key))

        if CourseRunGradingStatus.is_complete(run):
            self.stdout.write(
                self.style.SUCCESS(
                    'Final grades for course "{0}" are complete'.format(edx_course_key)
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
                            'Final grades for course "{0}" are being processed'.format(edx_course_key)
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            'Async task to freeze grade for course "{0}" '
                            'are done, but course is not marked as complete.'.format(edx_course_key)
                        )
                    )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        'Final grades for course "{0}" are marked as they are being processed'
                        ', but no task found.'.format(edx_course_key)
                    )
                )
        else:
            self.stdout.write(
                self.style.WARNING(
                    'Final grades for course "{0}" are not being processed yet'.format(edx_course_key)
                )
            )
        message_detail = ', where {0} failed authentication'.format(failed_users_count) if failed_users_count else ''
        users_in_cache = set(CachedEnrollment.get_cached_users(run)).intersection(
            set(CachedCurrentGrade.get_cached_users(run))
        )
        self.stdout.write(
            self.style.SUCCESS(
                'The students with a final grade are {0}/{1}{2}'.format(
                    FinalGrade.objects.filter(course_run=run).count(),
                    len(users_in_cache),
                    message_detail
                )
            )
        )
