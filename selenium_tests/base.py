"""Basic selenium tests for MicroMasters"""
from base64 import b64encode
import logging
import os
import socket
from urllib.parse import (
    ParseResult,
    urlparse,
)

from backends.edxorg import EdxOrgOAuth2
from profiles.factories import ProfileFactory
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.db import (
    connection,
    transaction,
)
from django.db.models.signals import post_save
from factory.django import mute_signals
from selenium.webdriver import (
    DesiredCapabilities,
    Remote,
)
from selenium.webdriver.support.wait import WebDriverWait

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
        # ensure index exists
        recreate_index()

        capabilities = DesiredCapabilities.CHROME.copy()
        capabilities['chromeOptions'] = {
            'binary': os.getenv('CHROME_BIN', '/usr/bin/google-chrome-stable'),
            'args': ['--no-sandbox'],
        }
        cls.selenium = Remote(
            os.getenv('SELENIUM_URL', 'http://grid:24444/wd/hub'),
            capabilities,
        )
        cls.selenium.implicitly_wait(10)

    def setUp(self):
        super().setUp()
        # Ensure index exists
        recreate_index()

        with mute_signals(post_save):
            profile = ProfileFactory.create()
        self.user = profile.user
        self.password = "pass"
        self.user.set_password(self.password)
        self.user.save()
        username = "{}_edx".format(self.user.username)
        self.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid=username,
        )

    @classmethod
    def tearDownClass(cls):
        cls.selenium.quit()
        delete_index()
        super().tearDownClass()

    def tearDown(self):
        if self._outcome.errors:
            try:
                self.take_screenshot()
            except:  # pylint: disable=bare-except
                log.exception("Unable to take selenium screenshot")

        with connection.cursor() as cursor:
            # Drop a troublesome unused table
            # This table is preventing the flush command from working:
            # https://github.com/wagtail/wagtail/issues/1824
            # It seems unused so it's easiest just to replace it behind the scenes
            with transaction.atomic():
                cursor.execute("DROP TABLE IF EXISTS wagtailsearch_editorspick")
                cursor.execute("CREATE TABLE wagtailsearch_editorspick ()")

                # Terminate all other db connections. There's an exception regarding
                # multiple connections at the same time and I'm not sure how else to work around it.
                cursor.execute("""SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity WHERE pid <> pg_backend_pid()""")

        super().tearDown()

    def wait(self):
        """Helper function for WebDriverWait"""
        return WebDriverWait(self.selenium, 5)

    def get(self, url):
        """Use self.live_server_url with a URL which will work for external services"""
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

    def login_via_admin(self, user):
        """Make user a superuser, login via admin, then undo user superuser status"""
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
        for entry in self.selenium.get_log("browser"):
            if 'chrome-extension' in entry['message']:
                continue
            messages.append(entry)

        assert len(messages) == 0

    def dump_console_logs(self):
        """Helper method to print out selenium logs (will consume the logs)"""
        for row in self.selenium.get_log("browser"):
            print(row)

    def dump_html(self):
        """Helper method to print out body HTML"""
        print(self.selenium.find_element_by_tag_name("body").get_attribute("innerHTML"))
