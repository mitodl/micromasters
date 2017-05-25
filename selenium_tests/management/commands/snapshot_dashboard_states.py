"""Management command to attach avatars to profiles"""
import os
import sys
import unittest

from django.core.management import (
    BaseCommand,
    call_command,
)
from django.test.utils import override_settings

from courses.models import Program
from dashboard.models import ProgramEnrollment
from seed_data.management.commands.alter_data import EXAMPLE_COMMANDS
from selenium_tests.base import SeleniumTestsBase


class DashboardStates(SeleniumTestsBase):
    """Runs through each dashboard state taking a snapshot"""
    def test_dashboard_states(self):
        """Iterate through all possible dashboard states and take screenshots of each one"""
        self.user = self.create_user()
        self.user.username = 'staff'
        self.user.set_password(self.password)
        self.user.save()

        # Update profile to pass validation so we don't get redirected to the signup page
        profile = self.user.profile
        profile.phone_number = '+93-23-232-3232'
        profile.filled_out = True
        profile.agreed_to_terms_of_service = True
        profile.save()

        self.get("/admin")
        self.login_via_admin(self.user)
        call_command("seed_db")

        db_path = self.dump_db()
        for num, example_command in enumerate(EXAMPLE_COMMANDS):
            self.restore_db(db_path)

            ProgramEnrollment.objects.create(user=self.user, program=Program.objects.get(title='Analog Learning'))

            if "--course-run-key" in example_command.args:
                # Complicated to handle, and this is the same as the previous command anyway
                continue
            call_command("alter_data", example_command.command, *example_command.args)
            self.get("/dashboard")
            self.wait().until(lambda driver: driver.find_element_by_class_name('course-list'))
            self.selenium.execute_script('document.querySelector(".course-list").scrollIntoView()')
            self.take_screenshot("dashboard_state_{num:03d}_{command}".format(
                num=num,
                command=example_command.command,
            ))


class Command(BaseCommand):
    """
    Take screenshots of dashboard states
    """
    help = "Create snapshots of dashboard states"

    def handle(self, *args, **options):
        os.environ['DJANGO_LIVE_TEST_SERVER_ADDRESS'] = '0.0.0.0:8286'
        with override_settings(
            ELASTICSEARCH_INDEX='testindex',
            DEBUG=False,
        ):
            suite = unittest.TestLoader().loadTestsFromTestCase(DashboardStates)
            result = unittest.TextTestRunner(verbosity=2).run(suite)
            if not result.wasSuccessful():
                sys.exit(1)
