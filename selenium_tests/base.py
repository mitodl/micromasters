"""Basic selenium tests for MicroMasters"""
from base64 import b64encode
from datetime import datetime, timedelta
import logging
import os
import socket
from subprocess import check_call
from tempfile import mkstemp
from unittest.mock import patch
from urllib.parse import (
    ParseResult,
    urlparse,
)

from backends.edxorg import EdxOrgOAuth2
from profiles.factories import ProfileFactory
from django.conf import settings
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.management import call_command
from django.db import connection
from django.db.models.signals import post_save
from factory.django import mute_signals
import pytz
from selenium.webdriver import (
    DesiredCapabilities,
    Remote,
)
from selenium.webdriver.support.wait import WebDriverWait

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
from search.indexing_api import (
    delete_index,
    recreate_index,
)


log = logging.getLogger(__name__)


class SeleniumTestsBase(StaticLiveServerTestCase):
    """Base class for selenium tests"""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        # Patch functions so we don't contact edX
        cls.patchers = []
        cls.patchers.append(patch('ecommerce.views.enroll_user_on_success', autospec=True))
        for patcher in cls.patchers:
            patcher.start()

        # Clear and repopulate database using migrations
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
            os.getenv('SELENIUM_URL', 'http://grid:24444/wd/hub'),
            capabilities,
        )
        cls.selenium.implicitly_wait(10)

    def setUp(self):
        super().setUp()

        # Ensure Elasticsearch index exists
        recreate_index()

        # Create a user with a profile and fake edX social auth data
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        self.user = profile.user
        self.password = "pass"
        self.user.set_password(self.password)
        self.user.save()

        # Update profile to pass validation so we don't get redirected to the signup page
        profile.phone_number = '+93-23-232-3232'
        profile.filled_out = True
        profile.agreed_to_terms_of_service = True
        profile.save()

        # Create a fake edX social auth to make this user look like they logged in via edX
        later = datetime.now(tz=pytz.UTC) + timedelta(minutes=5)
        self.username = username = "{}_edx".format(self.user.username)
        self.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid=username,
            extra_data={
                'access_token': 'fake',
                'refresh_token': 'fake',
                'updated_at': later.timestamp(),
                'expires_in': 3600,
            }
        )
        UserCacheRefreshTime.objects.create(
            user=self.user,
            enrollment=later,
            certificate=later,
            current_grade=later,
        )

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
    def restore_db(cls):
        """Delete database and restore from database dump file"""
        cls.clear_db()
        check_call(["psql", *cls._get_database_args(), "-f", cls.database_dump_path, "-q"])

    def wait(self):
        """Helper function for WebDriverWait"""
        return WebDriverWait(self.selenium, 5)

    def get(self, url):
        """Use self.live_server_url with a URL which will work for external services"""
        # Swap out the hostname, which was set to 0.0.0.0 to allow external connections
        # Change it to use ip of this container instead
        pieces = urlparse(url)
        host = socket.gethostbyname(socket.gethostname())
        new_url = ParseResult(
            pieces.scheme,
            "{host}:{port}".format(host=host, port=pieces.port),
            pieces.path,
            pieces.params,
            pieces.query,
            pieces.fragment,
        ).geturl()
        self.selenium.get(new_url)
        self.wait().until(lambda driver: driver.find_element_by_tag_name("body"))
        self.assert_console_logs()

    def login_via_admin(self, user):
        """Make user into staff, login via admin, then undo staff status"""
        user.refresh_from_db()
        is_staff = user.is_staff
        user.is_staff = True
        user.save()

        self.get("{}/admin/".format(self.live_server_url))
        self.wait().until(lambda driver: driver.find_element_by_id("id_username"))
        self.selenium.find_element_by_id("id_username").send_keys(user.username)
        self.selenium.find_element_by_id("id_password").send_keys(self.password)
        self.selenium.find_element_by_css_selector("input[type=submit]").click()
        # This is the 'Welcome, username' box on the upper right
        self.wait().until(lambda driver: driver.find_element_by_id("user-tools"))

        user.is_staff = is_staff
        user.save()

    def take_screenshot(self, output_base64=False):
        """Helper method to take a screenshot and put it in a temp directory"""
        test_method_name = self._testMethodName

        repo_root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
        filename = os.path.join(repo_root, "{}.png".format(test_method_name))

        self.selenium.save_screenshot(filename)
        print("PNG screenshot for {test} output to {filename}".format(
            test=test_method_name,
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
