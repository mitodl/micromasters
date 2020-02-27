"""Management command to take screenshots and save API results for learner search states"""
# pylint: disable=redefined-outer-name,unused-argument
import os
import sys

from django.core.management import (
    BaseCommand,
    call_command,
)
from django.db import connection
from django.test import override_settings
from django.contrib.auth.models import User
from faker.generator import random
import pytest
from selenium.common.exceptions import ElementNotVisibleException
from selenium.webdriver.common.by import By

from courses.models import Program
from dashboard.models import ProgramEnrollment
from roles.models import Role, Staff
from search.indexing_api import recreate_index
from selenium_tests.data_util import create_user_for_login
from selenium_tests.util import (
    DEFAULT_PASSWORD,
    DatabaseLoader,
    terminate_db_connections,
    should_load_from_existing_db,
)
from selenium_tests.page import LoginPage


# We need to have pytest skip this file when collecting tests to run, but we also want to run it as a test
# when invoked by this command so we can take advantage of Selenium and the test database infrastructure. This
# defaults the test to being skipped. When the management command runs it changes this flag to True to
# invoke the test.
RUNNING_LEARNERS_STATES = False

# We are passing options via global variable because of the bizarre way this management command is structured. Since
# pytest is used to invoke the tests, we don't have a good way to pass options to it directly.
LEARNERS_STATES_OPTIONS = None

DUMP_DIRECTORY = "output/learners_states"
SEEDED_BACKUP_DB_NAME = "backup_selenium_learners_seeded_db"


def make_filename(num, name, output_directory='', use_mobile=False):
    """Format the filename without extension for dashboard states"""
    return os.path.join(
        output_directory,
        "learners_state_{num:03d}_{command}{mobile}".format(
            num=num,
            command=name,
            mobile="_mobile" if use_mobile else "",
        )
    )


@pytest.fixture(scope="session")
def seeded_database_loader():
    """
    Fixture for a DatabaseLoader object. Using a different object than the fixture defined
    in selenium_tests/conftest.py because we don't want to overwrite the backup database used
    in the actual Selenium test suite.
    """
    return DatabaseLoader(db_backup_name=SEEDED_BACKUP_DB_NAME)


@pytest.fixture(scope="session")
def test_data(django_db_blocker, seeded_database_loader, pytestconfig):
    """
    Fixture that creates a login-enabled test user and backs up a seeded database to be
    loaded in between dashboard states and cleaned up at the end of the test run.
    """
    user = None
    with django_db_blocker.unblock():
        with connection.cursor() as cur:
            load_from_existing_db = should_load_from_existing_db(seeded_database_loader, cur, config=pytestconfig)
            if not load_from_existing_db:
                user = create_user_for_login(is_staff=True, username='staff')
                call_command("seed_db")
                # Analog Learning program enrollment is being created here because
                # no programs are enrolled in the initial data snapshot. Setting this enrollment
                # ensures that the user will see the Analog Learning program in the dashboard.
                # Right now we manually delete this enrollment in scenarios where we want the user
                # to see the Digital Learning dashboard.
                ProgramEnrollment.objects.create(
                    user=user,
                    program=Program.objects.get(title='Analog Learning')
                )
                Role.objects.create(
                    user=user, role=Staff.ROLE_ID, program=Program.objects.get(title='Analog Learning')
                )
                seeded_database_loader.create_backup(db_cursor=cur)
    if load_from_existing_db:
        with django_db_blocker.unblock():
            terminate_db_connections()
        seeded_database_loader.load_backup()
        user = User.objects.get(username='staff')
    yield dict(user=user)


class LearnersStates:
    """Runs through each learner search page state taking a snapshot"""

    def __init__(self, user=None):
        """
        Args:
            user (User): A User
        """
        self.user = user

    def __iter__(self):
        """
        Iterator over all dashboard states supported by this command.

        Yields:
            tuple of scenario_func, name:
                scenario_func is a function to make modifications to the database to produce a scenario
                name is the name of this scenario, to use with the filename
        """
        # Generate scenarios from all alter_data example commands

        yield (self.simple_scenario(""), "no_filters")
        yield (self.simple_scenario("birth_location[0]=ES"), "spain")
        yield (self.simple_scenario("payment_status[0]=Paid&birth_location[0]=ES"), "spain_paid")
        yield (self.simple_scenario("courses[0]=Analog Learning 100"), "100_course")
        yield (
            self.simple_scenario("courses[0]=Analog Learning 100&final-grade[min]=67&final-grade[max]=78"),
            "100_course_70s_grade",
        )
        yield (
            self.simple_scenario(
                "courses[0]=Analog Learning 100&final-grade[min]=67&final-grade[max]=78&"
                "num-courses-passed[min]=3&num-courses-passed[max]=3"
            ),
            "100_course_70s_grade_3_courses_passed",
        )
        yield (
            self.simple_scenario(
                "courses[0]=Analog Learning 100&final-grade[min]=60&"
                "final-grade[max]=100&grade-average[min]=80&grade-average[max]=90"
            ),
            "100_course_passing_final_grade_80s_avg_grade"
        )
        yield (
            self.simple_scenario(
                "courses[0]=Analog Learning 200&payment_status[0]=Paid&semester[0]=2016 - Summer",
            ),
            "200_course_paid_2016__no_results",
        )
        yield (
            self.simple_scenario(
                "semester[0]=2015 - Summer&semester[1]=2016 - Summer&q=cam"
            ),
            "multiple_semester_select_with_payment_status_all",
        )
        yield (
            self.simple_scenario(
                "semester[0]=2015 - Summer&payment_status[0]=Paid&q=cam"
            ),
            "semester_selected_with_paid",
        )
        yield (
            self.simple_scenario(
                "semester[0]=2015 - Summer&payment_status[0]=Paid&courses[0]=Analog Learning 100&" +
                "semester[1]=2016 - Summer&q=cam"
            ),
            "multiple_semester_select_with_course",
        )
        yield (
            self.simple_scenario(
                "birth_location[0]=CA&country[0][0]=US&country[1][0]=US-ND"
            ),
            "canadian_north_dakotan",
        )
        yield (
            self.simple_scenario(
                "education_level[0]=hs&company_name[0]=Goldman Sachs"
            ),
            "high_school_goldman",
        )
        yield (
            self.simple_scenario("semester[0]=2015 - Summer&q=cam"), "2015_cam",
        )
        yield (
            self.simple_scenario("education_level[0]=m"), "grad"
        )

    def simple_scenario(self, url):
        """
        Just go to the URL
        """
        return lambda: "/learners?" + url


# pylint: disable=too-many-locals
@pytest.mark.skipif(
    'not RUNNING_DASHBOARD_STATES',
    reason='DashboardStates test suite is only meant to be run via management command',
)
def test_learners_states(browser, override_allowed_hosts, seeded_database_loader, django_db_blocker, test_data):
    """Iterate through all possible dashboard states and save screenshots/API results of each one"""
    output_directory = DASHBOARD_STATES_OPTIONS.get('output_directory')
    os.makedirs(output_directory, exist_ok=True)
    use_mobile = DASHBOARD_STATES_OPTIONS.get('mobile')
    if use_mobile:
        browser.driver.set_window_size(480, 854)

    learners_states = LearnersStates(test_data['user'])
    learners_state_iter = enumerate(learners_states)
    match = DASHBOARD_STATES_OPTIONS.get('match')
    if match is not None:
        learners_state_iter = filter(
            lambda scenario: match in make_filename(scenario[0], scenario[1][1]),
            learners_state_iter
        )

    LoginPage(browser).log_in_via_admin(learners_states.user, DEFAULT_PASSWORD)
    recreate_index()

    # warm the cache
    browser.get("/learners")

    for num, (run_scenario, name) in learners_state_iter:
        skip_screenshot = False
        with django_db_blocker.unblock():
            learners_states.user.refresh_from_db()
            filename = make_filename(num, name, output_directory=output_directory, use_mobile=use_mobile)
            new_url = run_scenario()
            if not skip_screenshot:
                browser.get(new_url)
                browser.wait_until_loaded(By.CSS_SELECTOR, '.sk-hits,.no-hits')
                browser.wait_until_loaded(By.CLASS_NAME, 'micromasters-title')
                try:
                    browser.click_when_loaded(
                        By.CSS_SELECTOR,
                        '.filter--company_name .Select-arrow-zone',
                        retries=0,
                    )
                except ElementNotVisibleException:
                    # We are trying to make the work history visible, but if it doesn't exist
                    # there's nothing to do
                    pass
                # sometimes the browser scrolls down for some reason after clicking
                browser.driver.execute_script("window.scrollTo(0, 0)")
                browser.take_screenshot(filename=filename)
        with django_db_blocker.unblock():
            terminate_db_connections()
        seeded_database_loader.load_backup()


class Command(BaseCommand):
    """
    Take screenshots and save API results for dashboard states
    """
    help = "Take screenshots and save API results for dashboard states"

    def add_arguments(self, parser):
        parser.add_argument(
            "--match",
            dest="match",
            help="Runs only scenarios matching the given string",
            required=False,
        )
        parser.add_argument(
            "--create-db",
            dest="create_db",
            action='store_true',
            help="Passes the --create-db flag to py.test, guaranteeing a fresh database",
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
        parser.add_argument(
            "--output",
            dest="output_directory",
            default=DUMP_DIRECTORY,
            help="The output directory to put the files in",
            required=False,
        )

    def handle(self, *args, **options):
        random.seed(12345)
        if options.get('list_scenarios'):
            self.stdout.write('Scenarios:\n')
            for num, (_, name) in enumerate(LearnersStates()):
                self.stdout.write("  {:03}_{}\n".format(num, name))
            return

        if not os.environ.get('WEBPACK_DEV_SERVER_HOST'):
            # This should only happen if the user is running in an environment without Docker, which isn't allowed
            # for this command.
            raise Exception('Missing environment variable WEBPACK_DEV_SERVER_HOST.')

        if os.environ.get('RUNNING_SELENIUM') != 'true':
            raise Exception(
                "This management command must be run with ./scripts/test/run_snapshot_dashboard_states.sh"
            )

        # We need to use pytest here instead of invoking the tests directly so that the test database
        # is used. Using override_settings(DATABASE...) causes a warning message and is not reliable.
        global RUNNING_DASHBOARD_STATES  # pylint: disable=global-statement,global-variable-undefined
        RUNNING_DASHBOARD_STATES = True  # pylint: disable=global-variable-undefined
        global DASHBOARD_STATES_OPTIONS  # pylint: disable=global-statement,global-variable-undefined
        DASHBOARD_STATES_OPTIONS = options  # pylint: disable=global-variable-undefined

        with override_settings(
            ELASTICSEARCH_INDEX='testindex',
            ELASTICSEARCH_DEFAULT_PAGE_SIZE=15,
        ):
            pytest_args = ["{}::test_learners_states".format(__file__), "-s"]
            if options.get('create_db'):
                pytest_args.append('--create-db')
            sys.exit(pytest.main(args=pytest_args))
