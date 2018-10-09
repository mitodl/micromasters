"""
Retire user from MM
"""
from argparse import RawTextHelpFormatter
from django.contrib.auth.models import User
from django.core.management import BaseCommand, CommandError
from social_django.models import UserSocialAuth

from dashboard.models import ProgramEnrollment


class Command(BaseCommand):
    """
    Retire user from MicroMasters
    """
    help = """
Retire one or multiple users. For single user use:\n
`./manage.py retire_users --user=foo` or do \n
`./manage.py retire_users -u foo` \n

For multiple users, add arg `--user` for each user i.e:\n
`./manage.py retire_users --user=foo --user=bar --user=baz` or do \n
`./manage.py retire_users -u foo -u bar -u baz`
"""

    def create_parser(self, prog_name, subcommand):
        """
        create parser to add new line in help text.
        """
        parser = super(Command, self).create_parser(prog_name, subcommand)
        parser.formatter_class = RawTextHelpFormatter
        return parser

    def add_arguments(self, parser):
        """create args"""
        # pylint: disable=expression-not-assigned
        parser.add_argument(
            '-u',
            '--user',
            action='append',
            default=[],
            dest='users',
            help="Single or multiple user name"
        ),

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        user_names = kwargs.get("users", [])

        if len(user_names) <= 0:
            # show error when no user selected.
            raise CommandError("Please select user(s)")

        for user_name in user_names:
            # retire user
            self.stdout.write(f"Retiring user {user_name}")

            if not user_name:
                # invalid user name, can be empty string
                self.stdout.write(f"Invalid username: '{user_name}'", self.style.ERROR)
                continue

            try:
                user = User.objects.get(username=user_name)
            except User.DoesNotExist:
                self.stdout.write(
                    f"User '{user_name}' does not exist in MicroMasters",
                    self.style.ERROR
                )
                continue

            # mark user inactive
            user.is_active = False
            user.save()
            self.stdout.write(f"User {user_name} is_active set to False")

            # reset email_optin
            user.profile.email_optin = False
            user.profile.save()
            self.stdout.write(f"User {user_name} email_optin set to False")

            # reset program enrollments
            enrollment_delete_count, _ = ProgramEnrollment.objects.filter(user=user).delete()
            self.stdout.write(f"User {user_name}, {enrollment_delete_count} ProgramEnrollments rows deleted")

            # reset user social
            auth_delete_count, _ = UserSocialAuth.objects.filter(user=user).delete()
            self.stdout.write(f"User {user_name}, {auth_delete_count} SocialAuth rows deleted")

            # finish
            self.stdout.write(f"User '{user_name}' is retired")
