"""
Pytest configuration file for the entire selenium test suite
"""
# pylint: disable=redefined-outer-name,unused-argument
import os
from unittest.mock import patch
from types import SimpleNamespace
import pytest

from django.db import connection
from django.conf import settings
from selenium.webdriver import (
    DesiredCapabilities,
    Remote,
)

from selenium_tests.util import (
    Browser,
    DEFAULT_PASSWORD,
    DatabaseLoader,
    terminate_db_connections,
    should_load_from_existing_db,
)
from selenium_tests.data_util import create_user_for_login
from selenium_tests.page import LoginPage
from courses.factories import (
    ProgramFactory,
    CourseRunFactory,
)
from dashboard.models import ProgramEnrollment
from financialaid.factories import TierProgramFactory
from search.indexing_api import (
    delete_indices,
    recreate_index,
)
from roles.roles import Staff
from roles.models import Role


def pytest_exception_interact(node, call, report):
    """
    Pytest hook that runs if an unhandled and unexpected exception is raised
    """
    browser = None if not hasattr(node, 'funcargs') else node.funcargs.get('browser')
    # If the test case has a 'browser' fixture, it indicates that a selenium test case failed.
    if browser:
        # Take a screenshot to show the state of the selenium driver when the error occurred.
        browser.take_screenshot(filename_prefix='error', output_base64=settings.IS_CI_ENV)


@pytest.fixture(scope='session')
def database_loader():
    """Fixture for a DatabaseLoader instance"""
    return DatabaseLoader()


@pytest.fixture(scope='session', autouse=True)
def django_db_setup_override(django_db_setup, django_db_blocker, database_loader, pytestconfig):
    """
    Fixture provided by pytest-django to allow for custom Django database config.
    'django_db_setup' exists in the arguments because we want to perform the normal pytest-django
    database setup before applying our own changes.
    """
    with django_db_blocker.unblock():
        with connection.cursor() as cur:
            load_from_existing_db = should_load_from_existing_db(database_loader, cur, config=pytestconfig)
            if not load_from_existing_db:
                # Drop a wagtail table due to a bug: https://github.com/wagtail/wagtail/issues/1824
                cur.execute('DROP TABLE IF EXISTS wagtailsearch_editorspick CASCADE;')
                # Create the initial post-migration database backup to be restored before each test case
                database_loader.create_backup(db_cursor=cur)
    if load_from_existing_db:
        with django_db_blocker.unblock():
            terminate_db_connections()
        database_loader.load_backup()


@pytest.fixture(autouse=True)
def _use_db_loader(request, django_db_blocker, database_loader):
    """
    Fixture that replaces the test database with the post-migration backup before each test case.
    NOTE: This should run *before* the 'django_db' marker code is executed.
    """
    marker = request.keywords.get('django_db', None)
    if marker:
        with django_db_blocker.unblock():
            terminate_db_connections()
        database_loader.load_backup()


@pytest.fixture(scope='session')
def internal_api_patcher():
    """
    Fixture that patches certain internal app functions for the entire selenium suite execution
    """
    methods_to_patch = [
        'mail.api.MailgunClient._mailgun_request',
    ]
    patcher_mocks = []
    patchers = [patch(method_name) for method_name in methods_to_patch]
    for patcher in patchers:
        mock = patcher.start()
        mock.name = patcher.attribute
        patcher_mocks.append(mock)
    yield SimpleNamespace(
        patchers=patchers,
        patcher_mocks=patcher_mocks
    )
    for patcher in patchers:
        patcher.stop()


@pytest.fixture(autouse=True)
def patches(internal_api_patcher):
    """
    Fixture that resets session-wide patches before each test case function
    """
    for mock in internal_api_patcher.patcher_mocks:
        mock.reset_mock()
    return internal_api_patcher


@pytest.fixture(scope='session')
def driver():
    """
    Selenium driver fixture
    """
    # Start a selenium server running chrome
    capabilities = DesiredCapabilities.CHROME.copy()
    capabilities['chromeOptions'] = {
        'binary': os.getenv('CHROME_BIN', '/usr/bin/google-chrome-stable'),
        'args': ['--no-sandbox'],
    }
    driver = Remote(
        os.getenv('SELENIUM_URL', 'http://chrome:5555/wd/hub'),
        capabilities,
    )
    driver.implicitly_wait(10)
    yield driver
    driver.close()


@pytest.fixture(scope='session')
def browser(driver, set_live_server_host, live_server):
    """
    Fixture for our Browser abstraction. 'live_server' is provided by pytest-django.
    """
    return Browser(driver, live_server.url)


@pytest.fixture(scope='session')
def set_live_server_host():
    """
    Override pytest fixture to set the environment variable to set the host and port for the live server.
    Note that this env variable was removed by Django but is still used by pytest-django.
    Also, for some reason 0.0.0.0 no longer works to bind all hosts, but we only really need the
    external IP address.
    """
    os.environ.setdefault('DJANGO_LIVE_TEST_SERVER_ADDRESS', "0.0.0.0:7000")
    yield


@pytest.fixture()
def es_index():
    """
    Fixture for a properly initialized ES index
    """
    recreate_index()
    yield
    delete_indices()


@pytest.fixture()
def base_test_data():
    """
    Fixture for test data that should be available to any test case in the suite
    """
    # Create a live program with valid prices and financial aid
    program = ProgramFactory.create(
        live=True,
        financial_aid_availability=True,
        price=1000,
    )
    CourseRunFactory.create(course__program=program)
    TierProgramFactory.create_properly_configured_batch(2, program=program)
    # Create users
    staff_user, student_user = (create_user_for_login(is_staff=True), create_user_for_login(is_staff=False))
    ProgramEnrollment.objects.create(program=program, user=staff_user)
    ProgramEnrollment.objects.create(program=program, user=student_user)
    Role.objects.create(
        role=Staff.ROLE_ID,
        user=staff_user,
        program=program,
    )
    return SimpleNamespace(
        staff_user=staff_user,
        student_user=student_user,
        program=program
    )


@pytest.fixture()
def override_allowed_hosts(settings):
    """
    Override ALLOWED_HOSTS to force Django to allow outside connections to the selenium test server
    """
    settings.ALLOWED_HOSTS = "['*']"


@pytest.fixture()
def logged_in_staff(browser, override_allowed_hosts, base_test_data):
    """
    Fixture for a logged-in staff user

    Returns:
        User: User object
    """
    return LoginPage(browser).log_in_via_admin(base_test_data.staff_user, DEFAULT_PASSWORD)


@pytest.fixture()
def logged_in_student(browser, override_allowed_hosts, base_test_data):
    """
    Fixture for a logged-in student user

    Returns:
        User: User object
    """
    return LoginPage(browser).log_in_via_admin(base_test_data.student_user, DEFAULT_PASSWORD)


@pytest.fixture(autouse=True)
def warnings_as_errors():
    """
    Override other fixture to disable it. For some reason warnings as errors isn't working in selenium
    tests.
    """
