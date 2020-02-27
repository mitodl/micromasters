"""
Utility functionality for the selenium test suite
"""
import os
from base64 import b64encode
import socket
import json
from urllib.parse import (
    ParseResult,
    urlparse,
)
from subprocess import check_call, check_output, DEVNULL
import requests
from django.conf import settings
from django.db import connection
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from micromasters.utils import now_in_utc


DEFAULT_PASSWORD = 'pass'
DEFAULT_RETRY_COUNT = 3


class Browser:
    """
    Abstraction for the running browser. Provides general helper methods for interacting with the selenium driver.
    """
    ignored_log_messages = {
        'static.doubleclick.net',
        'React.createClass is deprecated',
        'chrome-extension',
        'This page includes a password or credit card input in a non-secure context',
        'favicon.ico',
        "'webkitURL' is deprecated. Please use 'URL' instead",
        "zendesk",
        "__webpack_hmr",
        "Warning: Accessing PropTypes via the main React package is deprecated.",
        "Warning: ReactTelephoneInput: React.createClass is deprecated",
        ".jpg - Failed to load resource",
        "smartlook",
    }

    def __init__(self, driver, live_server_url):
        """
        Args:
            driver (selenium.webdriver.remote.webdriver.WebDriver): Selenium driver
            live_server_url (str): The base URL of the live server
        """
        self.driver = driver
        self.live_server_url = live_server_url

    def wait(self, timeout=15):
        """Helper method to instantiate a WebDriverWait"""
        return WebDriverWait(driver=self.driver, timeout=timeout)

    def wait_until_loaded(self, by, value):
        """Helper method to tell the driver to wait until an element is loaded"""
        return self.wait().until(
            lambda driver: driver.find_element(by, value)
        )

    def wait_until_element_count(self, by, value, expected_count):
        """
        Helper method to tell the driver to wait until there are a certain number of matching elements on the page
        """
        return self.wait().until(
            lambda driver: len(driver.find_elements(by, value)) == expected_count
        )

    def click_when_loaded(self, by, value, retries=DEFAULT_RETRY_COUNT):
        """
        Helper method to tell the driver to wait until an element is loaded, then click it.
        Since clicking on page elements is the most common source of test flakiness in our selenium suite, this
        includes some functionality for retrying the click some number of times if specific exceptions are raised.
        """
        retries_remaining = retries
        wait = self.wait()
        while True:
            try:
                return wait.until(
                    lambda driver: driver.find_element(by, value)
                ).click()
            except WebDriverException:
                if retries_remaining > 0:
                    retries_remaining -= 1
                else:
                    raise

    def get_console_errors(self):
        """
        Gets non-ignored, non-warning console error messages from the running selenium browser

        Returns:
            list(str): Console error strings
        """
        return [
            entry['message'] for entry in self.driver.get_log("browser")
            if entry['level'] != "WARNING" and
            not any(ignored_msg in entry['message'] for ignored_msg in self.ignored_log_messages)
        ]

    def assert_no_console_errors(self):
        """Asserts that the browser has no significant console errors"""
        console_errors = self.get_console_errors()
        assert len(console_errors) == 0, str(console_errors)

    def dump_console_logs(self):
        """Prints all browser console log lines"""
        map(print, self.driver.get_log("browser"))

    def get(self, relative_url, ignore_errors=False):
        """
        Tells the browser to navigate to a relative URL (e.g.: '/learners') and makes sure there were
        no console errors during page load.
        """
        url = make_absolute_url(relative_url, self.live_server_url)
        self.driver.get(url)
        self.wait_until_loaded(By.TAG_NAME, 'body')
        if not ignore_errors:
            self.assert_no_console_errors()
        else:
            self.dump_console_logs()

    def set_dimension(self, width=None, height=None, use_scroll_height=True):
        """Helper function to set browser window dimensions"""
        current_dimensions = self.driver.get_window_size()
        if width is None:
            width = current_dimensions['width']
        if height is None:
            height = (
                current_dimensions['height']
                if not use_scroll_height
                else self.driver.execute_script("return document.body.scrollHeight")
            )
        self.driver.set_window_size(width, height)

    def take_screenshot(self, filename=None, filename_prefix='', output_base64=False):
        """
        Takes a screenshot of the selenium browser window and saves it
        """
        self.set_dimension()
        if filename is None:
            if filename_prefix:
                filename_prefix += '_'
            filename = '{}{}'.format(filename_prefix, now_in_utc().strftime('%Y_%m_%d_%H_%M_%S_%f'))
        repo_root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
        full_filename = os.path.join(repo_root, "{}.png".format(filename))
        self.driver.save_screenshot(full_filename)
        print("PNG screenshot for {filename} output to {full_filename}".format(
            filename=filename,
            full_filename=full_filename,
        ))
        if output_base64:
            # Can be useful for travis where we don't have access to build artifacts
            with open(full_filename, 'rb') as f:
                print("Screenshot as base64: {}".format(b64encode(f.read())))

    def store_api_results(self, edx_username, filename=None):
        """Helper method to save certain GET REST API responses"""
        sessionid = self.driver.get_cookie('sessionid')['value']
        for endpoint_url, endpoint_name in [
                ("/api/v0/dashboard/{}/".format(edx_username), 'dashboard'),
                ("/api/v0/coupons/", 'coupons'),
                ("/api/v0/course_prices/{}/".format(edx_username), 'course_prices'),
        ]:
            absolute_url = make_absolute_url(endpoint_url, self.live_server_url)
            api_json = requests.get(absolute_url, cookies={'sessionid': sessionid}).json()
            with open("{filename}.{api_name}.json".format(
                filename=filename,
                api_name=endpoint_name,
            ), 'w') as f:
                json.dump(api_json, f, indent="    ")


def make_absolute_url(relative_url, absolute_base):
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


def terminate_db_connections():
    """Terminates active connections to the database being used by Django"""
    kill_connection_sql = \
        "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid();"
    with connection.cursor() as cur:
        cur.execute(kill_connection_sql)
    connection.close()


class DatabaseLoader:
    """Backs up and restores databases using SQL and Postgres command line tools"""
    DEFAULT_BACKUP_DB_NAME = 'backup_selenium_db'

    def __init__(self, db_settings=None, db_backup_name=None):
        """
        Constructor

        Args:
            db_settings (dict): A dict of database settings
            db_backup_name (str): The name that will be given to the backup database
        """
        self.db_settings = db_settings or settings.DATABASES['default']
        self.db_name = self.db_settings['NAME']
        if self.db_name[0:5] != 'test_':
            raise Exception(
                "The test suite is attempting to use the database '{}'."
                "The test database should have a name that begins with 'test_'. Exiting...".format(self.db_name)
            )
        self.db_backup_name = db_backup_name or getattr(settings, 'BACKUP_DB_NAME', self.DEFAULT_BACKUP_DB_NAME)
        self.db_cmd_args = [
            "-h", self.db_settings['HOST'],
            "-p", str(self.db_settings['PORT']),
            "-U", self.db_settings['USER']
        ]

    def _db_copy_sql(self, from_db, to_db):
        """
        Helper method to generate a SQL statement that copies a database to another target database

        Args:
            from_db (str): Name of the origin database
            to_db (str): Name of the target database

        Returns:
            bytes: utf8-encoded create statement
        """
        return """CREATE DATABASE {to_db} TEMPLATE {from_db}""".format(
            from_db=from_db,
            to_db=to_db,
        ).encode('utf-8')

    def has_backup(self, db_cursor):
        """
        Checks if a backup db already exists

        Args:
            db_cursor (django.db.connection.cursor): A database cursor

        Returns:
            bool: Whether or not the backup db exists
        """
        db_cursor.execute("SELECT 1 FROM pg_database WHERE datname='{}'".format(self.db_backup_name))
        return db_cursor.fetchone() is not None

    def create_backup(self, db_cursor):
        """
        Copies the main database to a backup

        Args:
            db_cursor (django.db.connection.cursor): A database cursor
        """
        db_cursor.execute('DROP DATABASE IF EXISTS {to_db};'.format(to_db=self.db_backup_name))
        db_cursor.execute(self._db_copy_sql(self.db_name, self.db_backup_name))

    def load_backup(self):
        """
        Drops the main database and loads the backup
        """
        check_call(["dropdb", *self.db_cmd_args, self.db_name], stdout=DEVNULL, stderr=DEVNULL)
        sql = self._db_copy_sql(self.db_backup_name, self.db_name)
        check_output(["psql", *self.db_cmd_args], input=sql)

    def cleanup(self, db_cursor):
        """
        Removes the backup database

        Args:
            db_cursor (django.db.connection.cursor): A database cursor
        """
        db_cursor.execute('DROP DATABASE IF EXISTS {to_db};'.format(to_db=self.db_backup_name))


def should_load_from_existing_db(database_loader, cursor, *, config):
    """
    Helper method to determine whether or not a backup database should be loaded to begin
    test execution. A backup db should be used if that backup exists, and if the pytest config
    options don't indicate that the database should be freshly created to start the the test
    suite execution.

    Args:
        database_loader (DatabaseLoader): A DatabaseLoader instance
        cursor (django.db.connection.cursor): A database cursor
        config (Config): The pytest configuration

    Returns:
        bool: Whether or not a backup database should be loaded to begin test execution
    """
    # We should load a db backup to start the test suite if that backup exists,
    # and if the config options don't indicate that the database should be freshly
    # created to start the the test suite execution
    return (
        config.option.reuse_db and
        not config.option.create_db and
        database_loader.has_backup(db_cursor=cursor)
    )
