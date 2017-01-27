"""
Authorize for exam of passed users
"""
from django.core.management import BaseCommand

from exams.utils import bulk_authorize_for_exam


class Command(BaseCommand):
    """
    Authorizations of exam of passed users
    """
    help = "Trigger exam authorization when for users who have paid and passed course(s) "

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
        parser.add_argument(
            "--all",
            action='store_true',
            help="Authorize eligible users for exams."
        )

    def handle(self, *args, **options):
        """
        Trigger exam authorizations for user for a course if he has passed and paid for it.
        """
        all_allowed = options.get("all")
        program_id = options.get("program_id")
        username = options.get("username")

        if all_allowed:
            bulk_authorize_for_exam()
            self.stdout.write(self.style.SUCCESS('Done with authorization process'))
        elif program_id or username:
            bulk_authorize_for_exam(
                program_id=program_id,
                username=username
            )
            self.stdout.write(self.style.SUCCESS('Done with authorization process'))
        else:
            self.stdout.write(self.style.ERROR('Incomplete arguments. Please use --help to see options'))
