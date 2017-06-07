"""Management command to attach avatars to profiles"""
import itertools
import os
import sys
from urllib.parse import quote_plus

from django.core.management import (
    BaseCommand,
    call_command,
)
from django.test import override_settings
import pytest

from courses.factories import CourseRunFactory
from courses.models import (
    Course,
    CourseRun,
    Program,
)
from dashboard.models import ProgramEnrollment
from ecommerce.models import (
    Coupon,
    UserCoupon,
)
from exams.factories import ExamRunFactory
from grades.factories import ProctoredExamGradeFactory
from seed_data.management.commands.alter_data import EXAMPLE_COMMANDS
from selenium_tests.base import SeleniumTestsBase


# We need to have pytest skip DashboardStates when collecting tests to run, but we also want to run it as a test
# when invoked by this command so we can take advantage of Selenium and the test database infrastructure. This
# defaults the test to being skipped. When the management command runs it changes this flag to True to
# invoke the test.
RUNNING_DASHBOARD_STATES = False


def make_scenario(command):
    """Make lambda from ExampleCommand"""
    return lambda: call_command("alter_data", command.command, *command.args)


def bind_args(func, *args, **kwargs):
    """Helper function to bind the args to the closure"""
    return lambda: func(*args, **kwargs)


@pytest.mark.skipif(
    'not RUNNING_DASHBOARD_STATES',
    reason='DashboardStates test suite is only meant to be run via management command',
)
class DashboardStates(SeleniumTestsBase):
    """Runs through each dashboard state taking a snapshot"""
    def create_exams(self, edx_passed, exam_passed, is_offered):
        """Create an exam and mark it and the related course as passed or not passed"""
        if edx_passed:
            call_command(
                "alter_data", 'set_to_passed', '--username', 'staff',
                '--course-title', 'Analog Learning 200', '--grade', '75',
            )
        else:
            call_command(
                "alter_data", 'set_to_failed', '--username', 'staff',
                '--course-title', 'Analog Learning 200', '--grade', '45',
            )
        course = Course.objects.get(title='Analog Learning 200')
        exam_run = ExamRunFactory.create(course=course, eligibility_past=True, scheduling_past=True)
        for _ in range(2):
            ProctoredExamGradeFactory.create(
                user=self.user,
                course=course,
                exam_run=exam_run,
                passed=False,
            )
        ProctoredExamGradeFactory.create(
            user=self.user,
            course=course,
            exam_run=exam_run,
            passed=exam_passed,
        )
        if is_offered:
            CourseRunFactory.create(course=course)

    def with_prev_passed_run(self):
        """Add a passed run to a failed course. The course should then be passed"""
        call_command(
            "alter_data", 'set_to_failed', '--username', 'staff',
            '--course-title', 'Analog Learning 200', '--grade', '45',
        )
        call_command(
            "alter_data", 'set_past_run_to_passed', '--username', 'staff',
            '--course-title', 'Analog Learning 200',
        )

    def pending_enrollment(self):
        """
        Mark a course run as offered, then use the CyberSource redirect URL to view the pending enrollment status
        """
        run = CourseRun.objects.get(title='Analog Learning 100 - August 2015')
        call_command(
            'alter_data', 'set_to_offered', '--username', 'staff',
            '--course-run-title', 'Analog Learning 100 - August 2015',
        )
        run.refresh_from_db()
        return "/dashboard?status=receipt&course_key={}".format(quote_plus(run.edx_course_key))

    def contact_course(self):
        """Show a contact course team link"""
        call_command(
            "alter_data", 'set_to_passed', '--username', 'staff',
            '--course-title', 'Analog Learning 200', '--grade', '75',
        )
        course = Course.objects.get(title='Analog Learning 200')
        course.contact_email = 'example@example.com'
        course.save()

    def missed_payment_can_reenroll(self):
        """User has missed payment but they can re-enroll"""
        call_command(
            "alter_data", 'set_to_needs_upgrade', '--username', 'staff',
            '--course-title', 'Analog Learning 200', '--missed-deadline',
        )
        course = Course.objects.get(title='Analog Learning 200')
        CourseRunFactory.create(course=course)

    def with_coupon(self, amount_type, is_program, is_free):
        """Add a course-level coupon"""
        call_command("alter_data", 'set_to_offered', '--username', 'staff', '--course-title', 'Analog Learning 200')
        course = Course.objects.get(title='Analog Learning 200')
        if is_program:
            content_object = course.program
        else:
            content_object = course

        if amount_type == Coupon.FIXED_DISCOUNT or amount_type == Coupon.FIXED_PRICE:
            amount = 50
        else:
            if is_free:
                amount = 1
            else:
                amount = 0.25

        coupon = Coupon.objects.create(
            content_object=content_object, coupon_type=Coupon.STANDARD, amount_type=amount_type, amount=amount,
        )
        UserCoupon.objects.create(user=self.user, coupon=coupon)

    def test_dashboard_states(self):
        """Iterate through all possible dashboard states and take screenshots of each one"""
        self.user = self.create_user('staff')

        self.get("/admin")
        self.login_via_admin(self.user)
        call_command("seed_db")

        db_path = self.dump_db()

        # Generate scenarios from all alter_data example commands
        scenarios = [
            (make_scenario(command), command.command) for command in EXAMPLE_COMMANDS
            # Complicated to handle, and this is the same as the previous command anyway
            if "--course-run-key" not in command.args
        ]

        # Add scenarios for every combination of passed/failed course and exam
        for tup in itertools.product([True, False], repeat=3):
            edx_passed, exam_passed, is_passed = tup

            scenarios.append((
                bind_args(self.create_exams, edx_passed, exam_passed, is_passed),
                'create_exams_{}_{}_{}'.format(edx_passed, exam_passed, is_passed),
            ))

        # Also test for two different passing and failed runs on the same course
        scenarios.append((self.with_prev_passed_run, 'failed_with_prev_passed_run'))

        # Add scenarios for coupons
        coupon_scenarios = [
            (Coupon.FIXED_PRICE, True, False),
            (Coupon.FIXED_PRICE, False, False),
            (Coupon.FIXED_DISCOUNT, True, False),
            (Coupon.FIXED_DISCOUNT, False, False),
            (Coupon.PERCENT_DISCOUNT, True, False),
            (Coupon.PERCENT_DISCOUNT, False, False),
            (Coupon.PERCENT_DISCOUNT, True, True),
            (Coupon.PERCENT_DISCOUNT, False, True),
        ]
        scenarios.extend([
            (bind_args(self.with_coupon, *args), "coupon_{}_{}_{}".format(*args))
            for args in coupon_scenarios
        ])

        # Other misc scenarios
        scenarios.append((self.pending_enrollment, 'pending_enrollment'))
        scenarios.append((self.contact_course, 'contact_course'))
        scenarios.append((self.missed_payment_can_reenroll, 'missed_payment_can_reenroll'))

        for num, (run_scenario, name) in enumerate(scenarios):
            self.restore_db(db_path)

            ProgramEnrollment.objects.create(user=self.user, program=Program.objects.get(title='Analog Learning'))

            new_url = run_scenario()
            if new_url is None:
                new_url = '/dashboard'
            self.get(new_url)
            self.wait().until(lambda driver: driver.find_element_by_class_name('course-list'))
            self.selenium.execute_script('document.querySelector(".course-list").scrollIntoView()')
            filename = "dashboard_state_{num:03d}_{command}".format(
                num=num,
                command=name,
            )
            self.take_screenshot(filename)
            self.get("/api/v0/dashboard/{}/".format(self.edx_username))
            text = self.selenium.execute_script('return document.querySelector(".response-info pre").innerText')
            with open("{}.txt".format(filename), 'w') as f:
                f.write(text)


class Command(BaseCommand):
    """
    Take screenshots of dashboard states
    """
    help = "Create snapshots of dashboard states"

    def handle(self, *args, **options):
        os.environ['DJANGO_LIVE_TEST_SERVER_ADDRESS'] = '0.0.0.0:8286'
        if not os.environ.get('WEBPACK_DEV_SERVER_HOST'):
            raise Exception(
                'Missing environment variable WEBPACK_DEV_SERVER_HOST. Please set this to the IP address of your '
                'webpack dev server (omit the port number).'
            )

        global RUNNING_DASHBOARD_STATES  # pylint: disable=global-statement
        RUNNING_DASHBOARD_STATES = True
        with override_settings(ELASTICSEARCH_INDEX='testindex'):
            sys.exit(pytest.main(args=["{}::DashboardStates".format(__file__), "-s"]))
