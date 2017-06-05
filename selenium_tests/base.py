"""Basic selenium tests for MicroMasters"""
from base64 import b64encode
from datetime import timedelta
import logging
import os
import socket
from subprocess import (
    check_call,
    DEVNULL,
)
from tempfile import mkstemp
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
    Create an absolute URL for selenium testing given a relative URL

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


class SeleniumTestsBase(StaticLiveServerTestCase):
    """Base class for selenium tests"""

    # Password used by all created users
    PASSWORD = 'pass'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        # Patch functions so we don't contact edX
        cls.patchers = []
        cls.patchers.append(patch('ecommerce.views.enroll_user_on_success', autospec=True))
        for patcher in cls.patchers:
            patcher.start()

        # Clear and repopulate database using migrations
        if not pytest.config.option.reuse_db:
            cls.clear_db()
        call_command("migrate", noinput=True)

        # ensure index exists. This uses the database so it must come after all migrations are run.
        recreate_index()

        # Dump the database so we can do a quick revert and skip migrations
        cls.database_dump_path = cls.dump_db()
        cls.restore_db()

        # Start a selenium server running chrome
        capabilities = DesiredCapabilities.CHROME.copy()
        capabilities['chromeOptions'] = {
            'binary': os.getenv('CHROME_BIN', '/usr/bin/google-chrome-stable'),
            'args': ['--no-sandbox'],
        }

        # Setup selenium remote connection here. This should happen at the end of setUpClass
        # because if an exception is raised here, tearDownClass will not get executed, which will leave
        # a connection to selenium open preventing it from rerunning the test without restarting the grid.
        cls.selenium = Remote(
            os.getenv('SELENIUM_URL', 'http://chrome:5555/wd/hub'),
            capabilities,
        )
        cls.selenium.implicitly_wait(10)

    def setUp(self):
        super().setUp()

        self.restore_db()
        # Ensure Elasticsearch index exists
        recreate_index()

        self.user = self.create_user()

        # Create a live program with valid prices and financial aid
        run = CourseRunFactory.create(
            course__program__live=True,
            course__program__financial_aid_availability=True,
            course__program__price=1000,
        )
        self.program = program = run.course.program
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
        UserCoupon.objects.create(coupon=coupon, user=self.user)
        ProgramEnrollment.objects.create(program=run.course.program, user=self.user)

        # Iterate through browser logs to empty them so we start with a clean slate
        list(self.selenium.get_log("browser"))

    @classmethod
    def tearDownClass(cls):
        cls.selenium.quit()

        for patcher in cls.patchers:
            patcher.stop()

        delete_index()

        try:
            os.remove(cls.database_dump_path)
        except:  # pylint: disable=bare-except
            # Doesn't matter
            pass

        super().tearDownClass()

    def tearDown(self):
        if self._outcome.errors:
            try:
                self.take_screenshot()
            except:  # pylint: disable=bare-except
                log.exception("Unable to take selenium screenshot")

        try:
            self.assert_console_logs()
        finally:
            # Reset database to previous state
            self.restore_db()

            super().tearDown()

    def _fixture_teardown(self):
        """Override _fixture_teardown to not truncate the database. This class handles that stuff explicitly."""

    @classmethod
    def dump_db(cls):
        """Dump database to a file"""
        handle, path = mkstemp()
        os.close(handle)
        check_call(["pg_dump", *cls._get_database_args(), "-f", path])
        return path

    @classmethod
    def _get_database_args(cls):
        """Get connection arguments for postgres commands"""
        config = settings.DATABASES['default']
        return ["-h", config['HOST'], "-p", str(config['PORT']), "-U", config['USER'], config['NAME']]

    @classmethod
    def clear_db(cls):
        """Delete and create an empty database"""
        with connection.cursor() as cursor:
            # Terminate all other database connections first
            cursor.execute("""SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity WHERE pid <> pg_backend_pid()""")
        connection.close()
        check_call(["dropdb", *cls._get_database_args()])
        check_call(["createdb", *cls._get_database_args()])

    @classmethod
    def restore_db(cls, database_dump_path=None):
        """Delete database and restore from database dump file"""
        if database_dump_path is None:
            database_dump_path = cls.database_dump_path
        cls.clear_db()
        check_call(["psql", *cls._get_database_args(), "-f", database_dump_path, "-q"], stdout=DEVNULL)

    def wait(self):
        """Helper function for WebDriverWait"""
        return CustomWebDriverWait(driver=self.selenium, timeout=5)

    def get(self, relative_url):
        """Use self.live_server_url with a URL which will work for external services"""
        new_url = _make_absolute_url(relative_url, self.live_server_url)
        self.selenium.get(new_url)
        self.wait().until(lambda driver: driver.find_element_by_tag_name("body"))
        self.assert_console_logs()

    def login_via_admin(self, user):
        """Make user into staff, login via admin, then undo staff status"""
        user.refresh_from_db()
        is_staff = user.is_staff
        user.is_staff = True
        user.save()

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
