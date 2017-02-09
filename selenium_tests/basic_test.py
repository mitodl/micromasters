"""Basic selenium tests for MicroMasters"""
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
