"""Basic selenium tests for MicroMasters"""
from django.conf import settings
from django.db.models.signals import post_save
from factory.django import mute_signals

from courses.factories import ProgramFactory
from dashboard.models import ProgramEnrollment
from profiles.factories import ProfileFactory
from roles.models import (
    Staff,
    Role,
)
from search.indexing_api import index_program_enrolled_users
from selenium_tests.base import SeleniumTestsBase


class BasicTests(SeleniumTestsBase):
    """Basic selenium tests for MicroMasters"""

    def test_zero_price_purchase(self):
        """
        Do a $0 purchase using a 100% off program-level coupon
        """
        self.login_via_admin(self.user)
        self.get(self.live_server_url)

        # Click the dashboard link on the upper right of the homepage
        self.selenium.find_element_by_class_name("header-dashboard-link").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("pay-button"))
        self.assert_console_logs()
        # Click the Pay $0 button on dashboard
        self.selenium.find_element_by_class_name("pay-button").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("continue-payment"))
        # Click 'Continue' on the order summary page
        self.selenium.find_element_by_class_name("continue-payment").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("description"))
        # Assert that the purchase went through fine but enrolling in edX failed
        # Which makes sense since there is no edX for these tests
        assert self.selenium.find_element_by_css_selector(".course-action .description").text == (
            "Something went wrong. You paid for this course but are not enrolled. Contact us for help."
        )
        self.assert_console_logs()

    def test_learners(self):
        """
        Look at the learners page
        """
        self.login_via_admin(self.user)
        self.get(self.live_server_url)

        Role.objects.create(
            user=self.user,
            program=self.program,
            role=Staff.ROLE_ID,
        )

        page_size = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE
        with mute_signals(post_save):
            for _ in range((page_size * 2) - 5):
                profile = ProfileFactory.create(filled_out=True)
                ProgramEnrollment.objects.create(program=self.program, user=profile.user)

        other_program = ProgramFactory.create(live=True)
        ProgramEnrollment.objects.create(
            user=self.user,
            program=other_program,
        )

        # Update for new users and new role
        index_program_enrolled_users(ProgramEnrollment.objects.iterator())
        self.get("{}/learners".format(self.live_server_url))
        assert self.selenium.execute_script("return document.querySelectorAll('.learner-result').length") == page_size
        self.selenium.find_elements_by_class_name('sk-pagination-option')[1].click()
        # Verify that second page has 5 less elements
        self.wait().until(
            lambda driver: driver.execute_script(
                "return document.querySelectorAll('.learner-result').length"
            ) == page_size - 5
        )

        # Go to profile and back to learners to verify that nothing breaks
        self.selenium.find_element_by_class_name("user-menu").click()
        self.wait().until(
            lambda driver: "open" in driver.find_element_by_class_name("user-menu-dropdown").get_attribute("class")
        )
        self.selenium.find_element_by_css_selector(
            ".user-menu-dropdown a[href='/learner/{}']".format(self.username)
        ).click()
        self.wait().until(lambda driver: driver.find_element_by_class_name("user-page"))
        # Go back to learners
        self.selenium.find_element_by_css_selector("a[href='/learners']").click()
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))
