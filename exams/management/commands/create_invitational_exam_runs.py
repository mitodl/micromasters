"""
Creates expired exam runs for particular selection of students
"""
from django.contrib.auth.models import User
from django.core.management import BaseCommand, CommandError

from courses.models import CourseRun
from exams.factories import ExamRunFactory
from exams.models import ExamRun, ExamAuthorization


class Command(BaseCommand):
    """
    Creates ExamAuthorization for expired ExamRun for particular course_run and user
    """
    help = "Creates ExamAuthorization for expired ExamRun for particular course_run and user"

    def add_arguments(self, parser):
        parser.add_argument("edx_course_key", help="the edx_course_key for the course run")
        parser.add_argument("username", help="the edx_course_key for the course run")

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        edx_course_key = kwargs.get('edx_course_key')
        username = kwargs.get('username')

        user = User.objects.get(username=username)
        if user is None:
            raise CommandError('Username {} does not exist'.format(username))
        try:
            run = CourseRun.objects.get(edx_course_key=edx_course_key)
        except CourseRun.DoesNotExist:
            raise CommandError('Course Run for course_id "{}" does not exist'.format(edx_course_key))

        exam_run = ExamRun.get_schedulable_in_past(run.course).order_by('-date_last_schedulable').first()
        if exam_run is None:
            exam_run = ExamRunFactory.create(course=run.course, scheduling_past=True, eligibility_past=True)
        ExamAuthorization.objects.get_or_create(
            user=user,
            course=run.course,
            exam_run=exam_run,
        )
