"""Basic selenium tests for MicroMasters"""

from selenium_tests.base import SeleniumTestsBase


class BasicTests(SeleniumTestsBase):
    """Basic selenium tests for MicroMasters"""

    def test_zero_price_purchase(self):
        """
        Do a $0 purchase
        """
        self.get(self.live_server_url)
        self.wait().until(lambda driver: driver.find_element_by_tag_name("body"))
        self.selenium.find_element_by_class_name("open-signup-dialog").click()

        self.wait().until(lambda driver: driver.find_element_by_class_name("signup-modal-button"))
        self.take_screenshot()
