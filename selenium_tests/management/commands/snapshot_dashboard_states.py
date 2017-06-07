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
from financialaid.factories import FinancialAidFactory
from financialaid.models import FinancialAidStatus
from grades.factories import ProctoredExamGradeFactory
from seed_data.management.commands.alter_data import EXAMPLE_COMMANDS
from selenium_tests.base import SeleniumTestsBase


# We need to have pytest skip DashboardStates when collecting tests to run, but we also want to run it as a test
# when invoked by this command so we can take advantage of Selenium and the test database infrastructure. This
# defaults the test to being skipped. When the management command runs it changes this flag to True to
# invoke the test.
RUNNING_DASHBOARD_STATES = False

# We are passing options via global variable because of the bizarre way this management command is structured. Since
# pytest is used to invoke the tests, we don't have a good way to pass options to it directly.
DASHBOARD_STATES_OPTIONS = None


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

    def create_exams(self, edx_passed, exam_passed, new_offering):
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
        if new_offering:
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

    def with_financial_aid(self, status, is_enrolled):
        """Set the status of user's financial aid"""
        if is_enrolled:
            call_command(
                "alter_data", 'set_to_needs_upgrade', '--username', 'staff', '--course-title', 'Digital Learning 200'
            )
        else:
            call_command(
                "alter_data", 'set_to_offered', '--username', 'staff', '--course-title', 'Digital Learning 200'
            )
        Program.objects.get(title='Analog Learning').delete()
        # We need to use Digital Learning here since it has financial aid enabled. Deleting Analog Learning
        # because it's simpler than adjusting the UI to show the right one
        program = Program.objects.get(title='Digital Learning')
        ProgramEnrollment.objects.create(user=self.user, program=program)
        FinancialAidFactory.create(
            user=self.user,
            status=status,
            tier_program__program=program,
        )

    @classmethod
    def setUpTestData(cls):
        """
        Set up default user and run seed_db
        """
        cls.user = cls.create_user('staff')
        call_command("seed_db")

    @classmethod
    def _make_filename(cls, num, name, use_mobile=False):
        """Format the filename without extension for dashboard states"""
        return "dashboard_state_{num:03d}_{command}{mobile}".format(
            num=num,
            command=name,
            mobile="_mobile" if use_mobile else "",
        )

    def _make_scenarios(self):
        """
        Make generator of all scenarios supported by this command.

        Yields:
            tuple of scenario_func, name:
                scenario_func is a function to make modifications to the database to produce a scenario
                name is the name of this scenario, to use with the filename
        """
        # Generate scenarios from all alter_data example commands
        yield from (
            (make_scenario(command), command.command) for command in EXAMPLE_COMMANDS
            # Complicated to handle, and this is the same as the previous command anyway
            if "--course-run-key" not in command.args
        )

        # Add scenarios for every combination of passed/failed course and exam
        for tup in itertools.product([True, False], repeat=3):
            edx_passed, exam_passed, is_offered = tup

            yield (
                bind_args(self.create_exams, edx_passed, exam_passed, is_offered),
                'create_exams_{edx_passed}_{exam_passed}{new_offering}'.format(
                    edx_passed='edx_✔' if edx_passed else 'edx_✖',
                    exam_passed='exam_✔' if exam_passed else 'exam_✖',
                    new_offering='_with_new_offering' if is_offered else '',
                ),
            )

        # Also test for two different passing and failed runs on the same course
        yield (self.with_prev_passed_run, 'failed_with_prev_passed_run')

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
        yield from (
            (bind_args(self.with_coupon, *args), "coupon_{amount_type}_{program}_{free}".format(
                amount_type=args[0],
                program='program' if args[1] else 'course',
                free='free' if args[2] else 'not-free',
            ))
            for args in coupon_scenarios
        )

        # Other misc scenarios
        yield (self.pending_enrollment, 'pending_enrollment')
        yield (self.contact_course, 'contact_course')
        yield (self.missed_payment_can_reenroll, 'missed_payment_can_reenroll')

        # Financial aid statuses
        for status in FinancialAidStatus.ALL_STATUSES:
            for is_enrolled in (True, False):
                yield (
                    bind_args(self.with_financial_aid, status, is_enrolled),
                    'finaid_{status}{enrolled}'.format(
                        status=status,
                        enrolled="_needs_upgrade" if is_enrolled else "_offered",
                    )
                )

    def test_dashboard_states(self):
        """Iterate through all possible dashboard states and take screenshots of each one"""
        use_mobile = DASHBOARD_STATES_OPTIONS.get('mobile')
        if use_mobile:
            self.selenium.set_window_size(480, 854)

        self.login_via_admin(self.user)

        scenarios = self._make_scenarios()
        scenarios_with_numbers = enumerate(scenarios)

        suffix = DASHBOARD_STATES_OPTIONS.get('suffix')
        if suffix is not None:
            scenarios_with_numbers = (
                (num, (run_scenario, name))
                for (num, (run_scenario, name)) in scenarios_with_numbers
                if self._make_filename(num, name).endswith(suffix)
            )

        for num, (run_scenario, name) in scenarios_with_numbers:
            self.restore_db(self._get_data_backup())
            # Close Django Debug Toolbar
            self.selenium.execute_script("djdt.close()")

            ProgramEnrollment.objects.create(user=self.user, program=Program.objects.get(title='Analog Learning'))

            new_url = run_scenario()
            if new_url is None:
                new_url = '/dashboard'
            self.get(new_url)
            self.wait().until(lambda driver: driver.find_element_by_class_name('course-list'))

            filename = self._make_filename(num, name, use_mobile=use_mobile)
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

    def add_arguments(self, parser):
        parser.add_argument(
            "--suffix",
            dest="suffix",
            help="Runs only scenarios matching the given suffix",
            required=False,
        )
        parser.add_argument(
            "--list-scenarios",
            dest="list_scenarios",
            action='store_true',
            help="List scenario names and exit",
            required=False
        )
        parser.add_argument(
            "--mobile",
            dest="mobile",
            action='store_true',
            help="Take screenshots with a smaller width as if viewed with a mobile device",
            required=False,
        )

    def handle(self, *args, **options):
        if options.get('list_scenarios'):
            self.stdout.write('Scenarios:\n')
            for num, (_, name) in enumerate(DashboardStates()._make_scenarios()):  # pylint: disable=protected-access
                self.stdout.write("  {:03}_{}\n".format(num, name))
            return

        os.environ['DJANGO_LIVE_TEST_SERVER_ADDRESS'] = '0.0.0.0:7000-8000'
        if not os.environ.get('WEBPACK_DEV_SERVER_HOST'):
            # This should only happen if the user is running in an environment without Docker, which isn't allowed
            # for this command.
            raise Exception('Missing environment variable WEBPACK_DEV_SERVER_HOST.')

        # We need to use pytest here instead of invoking the tests directly so that the test database
        # is used. Using override_settings(DATABASE...) causes a warning message and is not reliable.
        global RUNNING_DASHBOARD_STATES  # pylint: disable=global-statement
        RUNNING_DASHBOARD_STATES = True
        global DASHBOARD_STATES_OPTIONS  # pylint: disable=global-statement
        DASHBOARD_STATES_OPTIONS = options

        with override_settings(
            ELASTICSEARCH_INDEX='testindex',
        ):
            sys.exit(pytest.main(args=["{}::DashboardStates".format(__file__), "-s"]))
