"""
Page classes for the selenium test suite
"""

from selenium.webdriver.common.by import By


class BasePage:
    """Base class to represent a page in the app"""

    def __init__(self, browser):
        self.browser = browser


class LoginPage(BasePage):
    """Page class for the login page"""

    def log_in_via_admin(self, user, password):
        """Make user into staff, login via admin, then undo staff status"""
        is_already_staff = user.is_staff
        if not is_already_staff:
            user.is_staff = True
            user.save()

        # Getting admin/ twice to work around an CSRF issue
        self.browser.get("admin/")
        self.browser.get("admin/")
        self.browser.wait_until_loaded(By.ID, "id_username")
        self.browser.driver.find_element_by_id("id_username").send_keys(user.username)
        self.browser.driver.find_element_by_id("id_password").send_keys(password)
        self.browser.driver.find_element_by_css_selector("input[type=submit]").click()
        # This is the 'Welcome, username' box on the upper right
        self.browser.wait_until_loaded(By.ID, "user-tools")

        if not is_already_staff:
            user.is_staff = False
            user.save()
        return user
