"""
Creates exam authorization for particular selection of students
"""
from django.contrib.auth.models import User
from django.core.management import BaseCommand, CommandError

from exams.models import ExamRun, ExamAuthorization


class Command(BaseCommand):
    """
    Creates ExamAuthorization for given ExamRun id and username
    """
    help = "Creates ExamAuthorization for provided ExamRun id and username"

    def add_arguments(self, parser):
        parser.add_argument("exam_run_id", help="the exam_run id created manually")
        parser.add_argument("username", help="the username of the learner")

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        exam_run_id = kwargs.get('exam_run_id')
        username = kwargs.get('username')

        user = User.objects.get(username=username)
        if user is None:
            raise CommandError('Username {} does not exist'.format(username))
        try:
            exam_run = ExamRun.objects.get(id=exam_run_id)
        except ExamRun.DoesNotExist:
            raise CommandError('ExamRun with this id "{}" does not exist'.format(exam_run_id))

        ExamAuthorization.objects.get_or_create(
            user=user,
            course=exam_run.course,
            exam_run=exam_run,
        )
