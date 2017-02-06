"""Basic selenium tests for MicroMasters"""
from base64 import b64encode
import logging
import os
import socket
from urllib.parse import (
    ParseResult,
    urlparse,
)

from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.db import (
    connection,
    transaction,
)
from selenium.webdriver import (
    DesiredCapabilities,
    Remote,
)
from selenium.webdriver.support.wait import WebDriverWait


log = logging.getLogger(__name__)


class SeleniumTestsBase(StaticLiveServerTestCase):
    """Base class for selenium tests"""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
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

    @classmethod
    def tearDownClass(cls):
        cls.selenium.quit()
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
                # multiple connections at the same time and I'm not sure how to work around it.
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

    def take_screenshot(self):
        """Helper method to take a screenshot and put it in a temp directory"""
        test_method_name = self._testMethodName

        repo_root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
        filename = os.path.join(repo_root, "{}.png".format(test_method_name))

        self.selenium.save_screenshot(filename)
        with open(filename, 'rb') as f:
            print("PNG screenshot for {test} output to {filename}, base64: {base64}".format(
                test=test_method_name,
                filename=filename,
                base64=b64encode(f.read()),
            ))

    def dump_console_logs(self):
        """Helper method to print out selenium logs (will consume the logs)"""
        for row in self.selenium.get_log("browser"):
            print(row)

    def dump_html(self):
        """Helper method to print out body HTML"""
        print(self.selenium.find_element_by_tag_name("body").get_attribute("innerHTML"))
