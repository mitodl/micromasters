"""Basic MicroMasters selenium tests"""
# pylint: disable=redefined-outer-name,unused-argument
import csv

from django.conf import settings
from django.db.models.signals import post_save
from factory import Iterator
from factory.django import mute_signals
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

from selenium_tests.data_util import create_enrolled_user_batch
from roles.models import (
    Staff,
    Role,
)
from dashboard.models import ProgramEnrollment
from courses.factories import (
    ProgramFactory,
    CourseFactory
)
from cms.factories import (
    FacultyFactory,
    InfoLinksFactory,
    ProgramCourseFactory,
    ProgramPageFactory,
    SemesterDateFactory,
)
from ecommerce.models import (
    Coupon,
    UserCoupon,
)
from ecommerce.factories import CouponFactory
from financialaid.models import (
    FinancialAid,
    FinancialAidStatus
)
from financialaid.factories import FinancialAidFactory
from profiles.models import Profile
from search.indexing_api import recreate_index


pytestmark = [
    pytest.mark.django_db,
]


def test_zero_price_purchase(browser, base_test_data, logged_in_student, mocker):
    """
    Test that a course can be purchased with a 100%-off coupon
    """
    mocker.patch('ecommerce.views.enroll_user_on_success')
    # Make a 100% off coupon. By setting the price to $0 we can avoid dealing with Cybersource
    coupon = CouponFactory.create(
        amount=1,
        amount_type=Coupon.PERCENT_DISCOUNT,
        coupon_type=Coupon.STANDARD,
        content_object=base_test_data.program
    )
    UserCoupon.objects.create(coupon=coupon, user=logged_in_student)

    browser.get("/")
    # Click the dashboard link on the upper right of the homepage
    browser.click_when_loaded(By.CLASS_NAME, "header-dashboard-link")
    browser.assert_no_console_errors()

    browser.click_when_loaded(By.CLASS_NAME, "enroll-button")
    browser.wait_until_loaded(By.CLASS_NAME, "continue-payment")

    # Click back then click the enroll now button again to assert back button behavior
    browser.driver.back()
    browser.click_when_loaded(By.CLASS_NAME, "enroll-button")
    browser.assert_no_console_errors()

    # Click 'Continue' on the order summary page
    browser.click_when_loaded(By.CLASS_NAME, "continue-payment")
    browser.assert_no_console_errors()
    browser.wait_until_loaded(By.CLASS_NAME, "toast-message")

    # No status message is shown here since this is FA program
    browser.assert_no_console_errors()


def test_approve_docs(browser, base_test_data, logged_in_staff):
    """
    Test the financial aid review page
    """
    program = base_test_data.program
    tier_program = program.tier_programs.get(discount_amount=0)
    FinancialAidFactory.create(
        user=base_test_data.student_user,
        tier_program=tier_program,
        status=FinancialAidStatus.DOCS_SENT,
    )

    browser.get("/financial_aid/review/{}/{}".format(program.id, FinancialAidStatus.DOCS_SENT))
    browser.click_when_loaded(By.CLASS_NAME, "mark-docs-as-received")
    alert = browser.driver.switch_to.alert
    alert.accept()
    browser.wait_until_loaded(By.CLASS_NAME, "alert-success")
    browser.assert_no_console_errors()

    def is_now_pending(driver):  # pylint: disable=unused-argument
        """Wait until the change to the financial aid takes effect"""
        assert FinancialAid.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        return financial_aid.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL

    browser.wait().until(is_now_pending)


def test_program_page(browser, base_test_data, logged_in_student):
    """
    Test viewing the program page
    """
    courses = list(base_test_data.program.course_set.all()) + \
        CourseFactory.create_batch(2, program=base_test_data.program)
    page = ProgramPageFactory.create(program=base_test_data.program, title="A Program Title")
    faculty = FacultyFactory.create_batch(3, program_page=page)
    info_links = InfoLinksFactory.create_batch(3, program_page=page)
    semester_dates = SemesterDateFactory.create_batch(3, program_page=page)
    program_courses = ProgramCourseFactory.create_batch(
        len(courses),
        program_page=page,
        course=Iterator(courses)
    )

    browser.get("/a-program-title/")
    faculty_elements = browser.driver.find_elements_by_css_selector(".faculty-tile")
    assert len(faculty) == len(faculty_elements)
    info_elements = browser.driver.find_elements_by_css_selector(".program-contact-link")
    assert len(info_links) == len(info_elements)
    semester_elements = browser.driver.find_elements_by_css_selector(".semester-date")
    assert len(semester_dates) == len(semester_elements)
    program_course_elements = browser.driver.find_elements_by_css_selector(".program-course .course-row")
    assert len(program_courses) == len(program_course_elements)


@pytest.mark.usefixtures("es_index", "logged_in_staff")
class TestLearnerSearchPage:
    """
    Learners search page tests
    """
    def test_learners(self, browser, base_test_data):
        """
        Page should contain the appropriate number of results on each page
        """
        page_size = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE
        num_users_to_create = page_size + 2
        create_enrolled_user_batch(num_users_to_create, program=base_test_data.program, is_staff=False)
        expected_second_page_count = num_users_to_create - page_size

        browser.get("/learners")
        browser.wait_until_element_count(By.CLASS_NAME, 'learner-result', page_size)
        browser.driver.find_elements_by_class_name('sk-pagination-option')[1].click()
        browser.wait_until_element_count(By.CLASS_NAME, 'learner-result', expected_second_page_count)

    def test_query_string_preserved(self, browser, base_test_data):
        """
        The querystring should not be affected when the learner search page loads
        """
        url = "/learners/?q=xyz"
        browser.get(url)
        browser.wait_until_loaded(By.CLASS_NAME, 'no-hits')
        assert browser.driver.current_url.endswith('/learners/?q=xyz')
        browser.assert_no_console_errors()

    def test_switch_program(self, browser, base_test_data, logged_in_staff):
        """
        Switching programs should show a different set of users
        """
        existing_program_user_count = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE
        create_enrolled_user_batch(existing_program_user_count, program=base_test_data.program, is_staff=False)

        new_program = ProgramFactory.create(live=True)
        new_program_user_count = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE - 1
        create_enrolled_user_batch(new_program_user_count, program=new_program, is_staff=False)
        ProgramEnrollment.objects.create(program=new_program, user=logged_in_staff)
        Role.objects.create(
            role=Staff.ROLE_ID,
            user=logged_in_staff,
            program=new_program,
        )

        # Load the learners page for the existing program
        browser.get("/learners")
        browser.wait_until_element_count(By.CLASS_NAME, 'learner-result', existing_program_user_count)
        # Switch programs and check that the correct number of users are returned
        switcher = browser.driver.find_element_by_css_selector('.micromasters-header .Select-input')
        switcher.send_keys(Keys.DOWN)
        switcher.send_keys(Keys.ENTER)
        browser.wait_until_element_count(By.CLASS_NAME, 'learner-result', new_program_user_count)
        # Refresh browser and verify the count is the same
        browser.get("/learners")
        browser.wait_until_element_count(By.CLASS_NAME, 'learner-result', new_program_user_count)

    def test_profile_navigation(self, browser, base_test_data):
        """
        Nothing should break when navigating to the profile and back to learners search page
        """
        create_enrolled_user_batch(2, program=base_test_data.program, is_staff=False)

        browser.get("/learners")
        browser.click_when_loaded(By.CLASS_NAME, 'menu-icon')
        browser.wait().until(
            lambda driver: "open" in driver.find_element_by_class_name('nav-drawer').get_attribute('class')
        )
        browser.click_when_loaded(By.CSS_SELECTOR, 'a .profile-image')
        browser.wait_until_loaded(By.CLASS_NAME, 'user-page')
        # Go back to learners
        browser.click_when_loaded(By.CLASS_NAME, 'menu-icon')
        browser.wait().until(
            lambda driver: "open" in driver.find_element_by_class_name('nav-drawer').get_attribute('class')
        )
        browser.click_when_loaded(By.CSS_SELECTOR, "a[href='/learners']")
        browser.wait_until_loaded(By.CLASS_NAME, 'learner-results')

    def test_country_limit(self, browser, base_test_data):
        """
        There should be more than 20 countries in current country and birth country facets
        """
        with open("profiles/data/countries.csv") as f:
            reader = csv.DictReader(f)
            country_codes = [row['code'] for row in reader]
        create_enrolled_user_batch(len(country_codes), program=base_test_data.program, is_staff=False)

        # Don't update elasticsearch for each profile, do that in bulk after
        with mute_signals(post_save):
            for i, profile in enumerate(Profile.objects.all()):
                code = country_codes[i % len(country_codes)]
                profile.birth_country = code
                profile.country = code
                profile.save()

        recreate_index()

        browser.get("/learners")
        browser.wait_until_loaded(By.CLASS_NAME, 'menu-icon')

        current_selector = '.filter--country .sk-hierarchical-menu-list__item'

        country_count = browser.driver.execute_script(
            "return document.querySelectorAll('{}').length".format(current_selector)
        )
        assert country_count == len(country_codes)
