"""
Freezes final grades for a course
"""
from django.core.exceptions import ImproperlyConfigured
from django.core.management import BaseCommand, CommandError

from courses.models import CourseRun
from grades.models import CourseRunGradingStatus
from grades.tasks import freeze_course_run_final_grades


class Command(BaseCommand):
    """
    Submits a celery task to freeze the final grades for all the users enrolled in a course run
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
        try:
            can_freeze = run.can_freeze_grades
        except ImproperlyConfigured:
            raise CommandError(f'Course Run for course_id "{edx_course_key}" is missing the freeze date')
        if not can_freeze:
            raise CommandError(f'Course Run for course_id "{edx_course_key}" cannot be frozen yet')
        if CourseRunGradingStatus.is_complete(run):
            self.stdout.write(
                self.style.SUCCESS(
                    f'Final grades for course "{edx_course_key}" are already complete'
                )
            )
            return

        freeze_course_run_final_grades.delay(run.id)
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully submitted async task to freeze final grades for course "{edx_course_key}"'
            )
        )
