"""
Authorize for exam of passed users
"""
from django.core.management import BaseCommand

from courses.models import Program
from dashboard.models import CachedEnrollment, ProgramEnrollment
from exams.util import (
    authorize_for_exam,
    get_mmtrack
)


class Command(BaseCommand):
    """
    Authorizations of exam of passed users
    """
    help = "Trigger exam authorizations when users already passed course"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            dest="username",
            default=None,
            help="Username who will be authorized for exam if he passed a course(s).",
            type=str
        )
        parser.add_argument(
            "--program-id",
            dest="program_id",
            default=None,
            help="Program id where we want to authorize users who passed course(s).",
            type=int
        )

    def handle(self, *args, **options):
        """
        Trigger exam authorizations for user for a course if he has passed and paid for it.
        """
        # pylint: disable=too-many-locals
        program_id = options.get("program_id", None)
        username = options.get("username", None)

        programs = (
            Program.objects.filter(id=program_id)
            if program_id else Program.objects.filter(exam_series_code__isnull=False, live=True)
        )

        for program in programs:
            users_qset = (
                ProgramEnrollment.objects.filter(program=program, user__username=username)
                if username else ProgramEnrollment.objects.filter(program=program)
            )
            users = users_qset.values_list('user', flat=True)

            for user in users:
                enrollments_qset = CachedEnrollment.user_course_qset(user, program=program)
                mmtrack = get_mmtrack(user, program)

                for enrollment in enrollments_qset:
                    # if user has passed and paid for the course
                    # and not already authorized for exam the create authorizations.
                    authorize_for_exam(mmtrack, enrollment.course_run)
