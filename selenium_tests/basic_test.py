"""Basic selenium tests for MicroMasters"""

from selenium_tests.base import SeleniumTestsBase


class BasicTests(SeleniumTestsBase):
    """Basic selenium tests for MicroMasters"""

    def test_zero_price_purchase(self):
        """
        Do a $0 purchase
        """
        self.login_via_admin(self.user)
        self.get(self.live_server_url)

        self.selenium.find_element_by_class_name("header-dashboard-link").click()
