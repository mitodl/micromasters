"""
Sets the global freeze status for the course run to "complete"
"""
from celery.result import GroupResult
from django.core.cache import caches
from django.core.management import BaseCommand, CommandError

from courses.models import CourseRun
from grades.models import CourseRunGradingStatus
from grades.tasks import CACHE_ID_BASE_STR
from micromasters.celery import app


cache_redis = caches['redis']


class Command(BaseCommand):
    """
    Sets the global freeze status for the course run to "complete"
    """
    help = ('Sets the global freeze status for the course run to "complete". '
            'This should not be necessary if all the users are processed')

    def add_arguments(self, parser):
        parser.add_argument("edx_course_key", help="the edx_course_key for the course run")

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        edx_course_key = kwargs.get('edx_course_key')
        try:
            run = CourseRun.objects.get(edx_course_key=edx_course_key)
        except CourseRun.DoesNotExist:
            raise CommandError('Course Run for course_id "{0}" does not exist'.format(edx_course_key))

        if not run.can_freeze_grades:
            self.stdout.write(
                self.style.ERROR(
                    'Course Run "{0}" cannot be marked as frozen yet'.format(edx_course_key)
                )
            )
            return

        if CourseRunGradingStatus.is_complete(run):
            self.stdout.write(
                self.style.SUCCESS(
                    'Course Run "{0}" is already marked as complete'.format(edx_course_key)
                )
            )
            return

        # check if there are tasks running
        cache_id = CACHE_ID_BASE_STR.format(edx_course_key)
        group_results_id = cache_redis.get(cache_id)
        if group_results_id is not None:
            results = GroupResult.restore(group_results_id, app=app)
            if results and not results.ready():
                self.stdout.write(
                    self.style.WARNING(
                        'Tasks for Course Run "{0}" are still running. '
                        'Impossible to set the global "complete" status'.format(edx_course_key)
                    )
                )
                return
            # if the tasks are done remove the entry in the cache
            cache_redis.delete(group_results_id)

        CourseRunGradingStatus.set_to_complete(run)
        self.stdout.write(
            self.style.SUCCESS(
                'Course Run "{0}" has been marked as complete'.format(edx_course_key)
            )
        )
