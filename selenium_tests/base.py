"""Basic selenium tests for MicroMasters"""
from base64 import b64encode
from datetime import timedelta
import json
import logging
import os
import socket
from subprocess import (
    CalledProcessError,
    check_call,
    check_output,
    DEVNULL,
)
from unittest.mock import patch
from urllib.parse import (
    ParseResult,
    urlparse,
)

from django.conf import settings
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.management import call_command
from django.db import connection
from django.db.models.signals import post_save
from factory.django import mute_signals
import pytest
import requests
from selenium.common.exceptions import (
    ElementNotVisibleException,
    StaleElementReferenceException,
    WebDriverException,
)
from selenium.webdriver import (
    DesiredCapabilities,
    Remote,
)
from selenium.webdriver.support.wait import WebDriverWait

from backends.edxorg import EdxOrgOAuth2
from courses.factories import CourseRunFactory
from dashboard.models import (
    ProgramEnrollment,
    UserCacheRefreshTime,
)
from ecommerce.models import (
    Coupon,
    UserCoupon,
)
from financialaid.models import (
    Tier,
    TierProgram,
)
from micromasters.utils import now_in_utc
from profiles.factories import ProfileFactory
from search.indexing_api import (
    delete_index,
    recreate_index,
)


log = logging.getLogger(__name__)


def _make_absolute_url(relative_url, absolute_base):
    """
    Create an absolute URL for selenium testing given a relative URL. This will also replace the host of absolute_base
    with the host IP of this instance.

    Args:
        relative_url (str): A relative URL
        absolute_base (str): An absolute URL which contains the http port and scheme we need

    Returns:
        str: An absolute URL pointing to the live server instance
    """
    # Swap out the hostname, which was set to 0.0.0.0 to allow external connections
    # Change it to use ip of this container instead
    absolute_pieces = urlparse(absolute_base)
    relative_pieces = urlparse(relative_url)
    host = socket.gethostbyname(socket.gethostname())
    return ParseResult(
        absolute_pieces.scheme,
        "{host}:{port}".format(host=host, port=absolute_pieces.port),
        relative_pieces.path,
        relative_pieces.params,
        relative_pieces.query,
        relative_pieces.fragment,
    ).geturl()


class CustomWebDriverWait(WebDriverWait):
    """WebDriverWait with extra custom methods"""

    def click(self, method, retries=3):
        """Ignore StaleElementReferenceExceptions when clicking an item"""
        while True:
            try:
                return self.until(method).click()
            except (StaleElementReferenceException, ElementNotVisibleException):
                if retries > 0:
                    retries -= 1
                else:
                    raise
            except WebDriverException as ex:
                if 'not clickable at point' not in ex.msg:
                    raise
                elif retries > 0:
                    retries -= 1
                else:
                    raise


# During setUpClass the tests will do some initialization of the database. To avoid running migrations once
# per test class we use this flag to determine the first time setUpClass is run.
INITIALIZED_DB = False


class SeleniumTestsBase(StaticLiveServerTestCase):
    """Base class for selenium tests"""

    # Password used by all created users
    PASSWORD = 'pass'
    first_time = now_in_utc()
    selenium = None
    patchers = []

    @classmethod
    def setUpClass(cls):
        try:
            super().setUpClass()

            # Patch functions so we don't contact edX
            cls.patchers = []
            cls.patchers.append(patch('ecommerce.views.enroll_user_on_success', autospec=True))
            for patcher in cls.patchers:
                patcher.start()

            # Clear and repopulate database using migrations
            global INITIALIZED_DB  # pylint: disable=global-statement
            if not pytest.config.option.reuse_db and not INITIALIZED_DB:
                cls.clear_db()
            INITIALIZED_DB = True
            call_command("migrate", noinput=True)

            # Copy the database so we can do a quick revert and skip migrations
            cls.backup_db(cls._get_migrations_backup())
            # ensure index exists. This uses the database so it must come after all migrations are run.
            # It must also come before working with any new models whose signals may involve Elasticsearch.
            recreate_index()

            # Create data used by each test in the test case
            cls.setUpTestData()

            # Make a copy of the database after setUpTestData so that
            cls.backup_db(cls._get_data_backup())

        except:
            # This is actually not the default thing to do for unittest.TestCase, but we have some stuff that needs
            # to cleanup
            cls.tearDownClass()
            raise

    @classmethod
    def setUpTestData(cls):
        """
        Create models at the class level here. These will be saved in the backup database and
        restored for quick access.
        """
        cls.user = cls.create_user()

        # Create a live program with valid prices and financial aid
        run = CourseRunFactory.create(
            course__program__live=True,
            course__program__financial_aid_availability=True,
            course__program__price=1000,
        )
        cls.program = program = run.course.program
        TierProgram.objects.create(
            tier=Tier.objects.create(name="$0 discount"),
            current=True,
            discount_amount=0,
            income_threshold=35000,
            program=program,
        )
        TierProgram.objects.create(
            tier=Tier.objects.create(name="$0 threshold"),
            current=True,
            discount_amount=150,
            income_threshold=0,
            program=program,
        )
        # Make a 100% off coupon. By setting the price to $0 we can avoid dealing with Cybersource
        coupon = Coupon(
            amount=1,
            amount_type=Coupon.PERCENT_DISCOUNT,
            coupon_type=Coupon.STANDARD,
        )
        coupon.content_object = program
        coupon.save()
        # Attach coupon and program to user
        UserCoupon.objects.create(coupon=coupon, user=cls.user)
        ProgramEnrollment.objects.create(program=run.course.program, user=cls.user)

    def setUp(self):
        try:
            super().setUp()

            self.restore_db(self._get_data_backup())
            # Ensure Elasticsearch index exists and is up to date
            recreate_index()

            # Start a selenium server running chrome
            capabilities = DesiredCapabilities.CHROME.copy()
            capabilities['chromeOptions'] = {
                'binary': os.getenv('CHROME_BIN', '/usr/bin/google-chrome-stable'),
                'args': ['--no-sandbox'],
            }

            # Setup selenium remote connection here. This should happen at the end of setUpClass
            # because if an exception is raised here, tearDownClass will not get executed, which will leave
            # a connection to selenium open preventing it from rerunning the test without restarting the grid.
            self.selenium = Remote(
                os.getenv('SELENIUM_URL', 'http://chrome:5555/wd/hub'),
                capabilities,
            )
            self.selenium.implicitly_wait(10)
        except:
            self.tearDown()
            raise

    @classmethod
    def tearDownClass(cls):
        for patcher in cls.patchers:
            patcher.stop()

        delete_index()

        # Restore to state right after migrations so that we leave the database in proper state to rerun
        cls.restore_db(cls._get_migrations_backup())
        cls._delete_db(cls._get_migrations_backup())
        cls._delete_db(cls._get_data_backup())

        super().tearDownClass()

    def tearDown(self):
        if self._outcome.errors:
            try:
                self.take_screenshot()
            except:  # pylint: disable=bare-except
                log.exception("Unable to take selenium screenshot")

        if self.selenium is not None:
            try:
                self.assert_console_logs()
            finally:
                self.selenium.quit()
                self.selenium = None

        super().tearDown()

    def _fixture_teardown(self):
        """Override _fixture_teardown to not truncate the database. This class handles that stuff explicitly."""

    @classmethod
    def backup_db(cls, backup_database_name):
        """Copy database to a backup database"""
        cls._copy_db(from_db=cls._get_database_name(), to_db=backup_database_name)

    @classmethod
    def clear_db(cls):
        """Clear the test database"""
        cls._terminate_connections()
        database_name = cls._get_database_name()
        cls._delete_db(database_name)
        cls._create_empty_db(database_name)

    @classmethod
    def _delete_db(cls, database_name):
        """Delete a database"""
        try:
            check_call(["dropdb", *cls._get_database_args(database_name)], stdout=DEVNULL, stderr=DEVNULL)
        except CalledProcessError:
            # Assuming this failed because database didn't exist
            pass

    @classmethod
    def _create_empty_db(cls, database_name):
        """Create an empty database"""
        check_call(["createdb", *cls._get_database_args(database_name)], stdout=DEVNULL, stderr=DEVNULL)

    @classmethod
    def _copy_db(cls, from_db, to_db):
        """Create a copy of a database, overwriting the old database if necessary"""
        # Can't use connection.cursor() here because database may not exist
        cls._terminate_connections()
        cls._delete_db(to_db)
        sql = """CREATE DATABASE {to_db} TEMPLATE {from_db}""".format(
            from_db=from_db,
            to_db=to_db,
        ).encode('utf-8')
        check_output(["psql", *cls._get_database_args(None)], input=sql)

    @classmethod
    def _terminate_connections(cls):
        """Terminate all database connections so we can modify the database"""
        with connection.cursor() as cursor:
            # Terminate all other database connections first
            cursor.execute("""SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity WHERE pid <> pg_backend_pid()""")
        connection.close()

    @classmethod
    def _get_default_database_config(cls):
        """Get default database configuration"""
        return settings.DATABASES['default']

    @classmethod
    def _get_database_name(cls):
        """Get name of the database (should be the test database)"""
        return cls._get_default_database_config()['NAME']

    @classmethod
    def _get_migrations_backup(cls):
        """Get name of database we use for storing migrations"""
        return "backup_migrations_{}".format(cls._get_database_name())

    @classmethod
    def _get_data_backup(cls):
        """Get name of database we use for data"""
        return "backup_data_{}".format(cls._get_database_name())

    @classmethod
    def _get_database_args(cls, database_name):
        """Get connection arguments for postgres commands"""
        config = cls._get_default_database_config()
        args = ["-h", config['HOST'], "-p", str(config['PORT']), "-U", config['USER']]
        if database_name is not None:
            args.append(database_name)
        return args

    @classmethod
    def restore_db(cls, backup_database_name):
        """Delete test database and restore from backup database"""
        cls._copy_db(from_db=backup_database_name, to_db=cls._get_database_name())

    def wait(self):
        """Helper function for WebDriverWait"""
        return CustomWebDriverWait(driver=self.selenium, timeout=5)

    def make_absolute_url(self, relative_url):
        """Make an absolute URL appropriate for selenium testing"""
        return _make_absolute_url(relative_url, self.live_server_url)

    def get(self, relative_url):
        """Use self.live_server_url with a URL which will work for external services"""
        new_url = self.make_absolute_url(relative_url)
        self.selenium.get(new_url)
        self.wait().until(lambda driver: driver.find_element_by_tag_name("body"))
        self.assert_console_logs()

    def login_via_admin(self, user):
        """Make user into staff, login via admin, then undo staff status"""
        user.refresh_from_db()
        is_staff = user.is_staff
        user.is_staff = True
        user.save()

        # Getting admin/ twice to work around an CSRF issue
        self.get("admin/")
        self.get("admin/")
        self.wait().until(lambda driver: driver.find_element_by_id("id_username"))
        self.selenium.find_element_by_id("id_username").send_keys(user.username)
        self.selenium.find_element_by_id("id_password").send_keys(self.PASSWORD)
        self.selenium.find_element_by_css_selector("input[type=submit]").click()
        # This is the 'Welcome, username' box on the upper right
        self.wait().until(lambda driver: driver.find_element_by_id("user-tools"))

        user.is_staff = is_staff
        user.save()

    def take_screenshot(self, name=None, output_base64=False):
        """Helper method to take a screenshot and put it in a temp directory"""
        width = self.selenium.get_window_size()['width']
        height = self.selenium.execute_script("return document.body.scrollHeight")
        self.selenium.set_window_size(width, height)

        if name is None:
            name = self._testMethodName

        repo_root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
        filename = os.path.join(repo_root, "{}.png".format(name))

        self.selenium.save_screenshot(filename)
        print("PNG screenshot for {name} output to {filename}".format(
            name=name,
            filename=filename,
        ))
        if output_base64:
            # Can be useful for travis where we don't have access to build artifacts
            with open(filename, 'rb') as f:
                print("Screenshot as base64: {}".format(b64encode(f.read())))

    def store_api_results(self, name=None):
        """Helper method to save certain GET REST API responses"""
        if name is None:
            name = self._testMethodName

        # Get the API results and store them alongside the screenshots
        sessionid = self.selenium.get_cookie('sessionid')['value']
        for api_url, api_name in [
                ("/api/v0/dashboard/{}/".format(self.edx_username), 'dashboard'),
                ("/api/v0/coupons/", 'coupons'),
                ("/api/v0/course_prices/{}/".format(self.edx_username), 'course_prices'),
        ]:
            absolute_url = self.make_absolute_url(api_url)
            api_json = requests.get(absolute_url, cookies={'sessionid': sessionid}).json()
            with open("{filename}.{api_name}.json".format(
                filename=name,
                api_name=api_name,
            ), 'w') as f:
                json.dump(api_json, f, indent="    ")

    def assert_console_logs(self):
        """Assert that console logs don't contain anything unexpected"""
        messages = []
        # Note that get_log(...) will consume the logs
        for entry in self.selenium.get_log("browser"):
            message = entry['message']
            if 'chrome-extension' in message:
                continue
            if 'This page includes a password or credit card input in a non-secure context' in message:
                continue
            if 'favicon.ico' in message:
                continue
            if "'webkitURL' is deprecated. Please use 'URL' instead" in message:
                continue
            if "zendesk" in message.lower():
                continue
            if "__webpack_hmr" in message:
                continue
            if "Warning: Accessing PropTypes via the main React package is deprecated." in message:
                continue
            if "Warning: ReactTelephoneInput: React.createClass is deprecated" in message:
                continue

            # warnings (e.g. deprecations) should not fail the tests
            if entry['level'] in ["WARNING"]:
                continue

            messages.append(entry)

        assert len(messages) == 0, str(messages)

    def dump_console_logs(self):
        """Helper method to print out selenium logs (will consume the logs)"""
        for row in self.selenium.get_log("browser"):
            print(row)

    def dump_html(self):
        """Helper method to print out body HTML"""
        print(self.selenium.find_element_by_tag_name("body").get_attribute("innerHTML"))

    @classmethod
    def create_user(cls, username=None):
        """Create a user with a profile and fake edX social auth data"""
        with mute_signals(post_save):
            profile = ProfileFactory.create(filled_out=True)
        user = profile.user

        if username is not None:
            user.username = username
            user.save()

        # Create a fake edX social auth to make this user look like they logged in via edX
        later = now_in_utc() + timedelta(minutes=5)
        user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(user.username),
            extra_data={
                'access_token': 'fake',
                'refresh_token': 'fake',
                'updated_at': later.timestamp(),
                'expires_in': 3600,
            }
        )
        UserCacheRefreshTime.objects.create(
            user=user,
            enrollment=later,
            certificate=later,
            current_grade=later,
        )

        user.set_password(cls.PASSWORD)
        user.save()

        # Update profile to pass validation so we don't get redirected to the signup page
        profile = user.profile
        profile.phone_number = '+1-800-888-8888'
        profile.country = 'US'
        profile.state_or_territory = 'US-MA'
        profile.postal_code = '02142'
        profile.filled_out = True
        profile.agreed_to_terms_of_service = True
        profile.save()

        return user

    def num_elements_on_page(self, selector, driver=None):
        """Count hits from a selector"""
        script = "return document.querySelectorAll({selector!r}).length".format(selector=selector)
        driver = driver or self.selenium
        return driver.execute_script(script)

    @property
    def edx_username(self):
        """Get the edx username for self.user"""
        return self.user.social_auth.get(provider=EdxOrgOAuth2.name).uid
