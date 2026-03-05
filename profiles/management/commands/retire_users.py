"""
Retire user from MM
"""
import logging
from argparse import RawTextHelpFormatter

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, CommandError
from django.db.models import Q
from social_django.models import UserSocialAuth

from dashboard.models import ProgramEnrollment

User = get_user_model()

log = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Retire user from MicroMasters
    """
    help = """
Retire one or multiple users. Username or email can be used to identify a user.

For single user use:\n
`./manage.py retire_users --user=foo` or do \n
`./manage.py retire_users -u foo` or do \n
`./manage.py retire_users -u foo@email.com` \n

For multiple users, add arg `--user` for each user i.e:\n
`./manage.py retire_users --user=foo --user=bar --user=baz` or do \n
`./manage.py retire_users --user=foo@email.com --user=bar@email.com --user=baz` or do \n
`./manage.py retire_users -u foo -u bar -u baz`
"""

    def create_parser(self, prog_name, subcommand, **kwargs):
        """
        create parser to add new line in help text.
        """
        parser = super().create_parser(prog_name, subcommand)
        parser.formatter_class = RawTextHelpFormatter
        return parser

    def add_arguments(self, parser):
        """create args"""
        parser.add_argument(
            '-u',
            '--user',
            action='append',
            default=[],
            dest='users',
            help="Single or multiple user name"
        )

    def display_messages(self, message, log_messages, is_error=False):
        """
        Display error on console
        Args:
            message (str): message to display
            is_error (bool): is error for styling
            log_messages (list): Accumulated message
        """
        self.stdout.write(message, style_func=self.style.ERROR if is_error else None)
        log_messages.append(message)

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        users = kwargs.get("users", [])

        if len(users) <= 0:
            # show error when no user selected.
            raise CommandError("Please select user(s)")

        for current_user in users:
            log_messages = []

            # retire user
            self.display_messages(f"Retiring user {current_user}", log_messages)

            if not current_user:
                # invalid user name, can be empty string
                self.display_messages(
                    f"Invalid user: '{current_user}'",
                    log_messages,
                    self.style.ERROR
                )
                continue

            try:
                user = User.objects.get(Q(username=current_user) | Q(email=current_user))
            except User.DoesNotExist:
                self.display_messages(
                    f"User '{current_user}' does not exist in MicroMasters",
                    log_messages,
                    is_error=True
                )
                continue

            # mark user inactive
            user.is_active = False
            user.save()
            self.display_messages(f"User {current_user} is_active set to False", log_messages)

            # reset email_optin
            user.profile.email_optin = False
            user.profile.save()
            self.display_messages(f"User {current_user} email_optin set to False", log_messages)

            # reset program enrollments
            enrollment_delete_count, _ = ProgramEnrollment.objects.filter(user=user).delete()
            self.display_messages(
                f"For user {current_user}: {enrollment_delete_count} ProgramEnrollments rows deleted",
                log_messages
            )

            # reset user social
            auth_delete_count, _ = UserSocialAuth.objects.filter(user=user).delete()
            self.display_messages(
                f"For user {current_user}: {auth_delete_count} SocialAuth rows deleted",
                log_messages
            )

            # finish
            self.display_messages(f"User '{current_user}' is retired", log_messages)
            log.info("\n".join(log_messages[1:]))
