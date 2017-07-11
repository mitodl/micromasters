"""Basic selenium tests for MicroMasters"""
from unittest.mock import patch

from django.conf import settings
from django.db.models.signals import post_save
from factory import Iterator
from factory.django import mute_signals
from selenium.webdriver.common.keys import Keys

from cms.factories import (
    FacultyFactory,
    InfoLinksFactory,
    ProgramCourseFactory,
    ProgramPageFactory,
    SemesterDateFactory,
)
from courses.factories import (
    CourseFactory,
    ProgramFactory,
)
from dashboard.models import ProgramEnrollment
from financialaid.constants import FinancialAidStatus
from financialaid.factories import FinancialAidFactory
from financialaid.models import (
    FinancialAid,
    TierProgram,
)
from roles.models import (
    Staff,
    Role,
)
from search.indexing_api import index_program_enrolled_users
from selenium_tests.base import SeleniumTestsBase


class BasicTests(SeleniumTestsBase):
    """Basic selenium tests for MicroMasters"""

    other_program = None

    def test_zero_price_purchase(self):
        """
        Do a $0 purchase using a 100% off program-level coupon
        """
        self.login_via_admin(self.user)
        self.get("/")

        # Click the dashboard link on the upper right of the homepage
        self.selenium.find_element_by_class_name("header-dashboard-link").click()
        self.assert_console_logs()

        # Click the Enroll Now button on dashboard
        self.wait().click(lambda driver: driver.find_element_by_class_name("enroll-button"))
        self.wait().until(lambda driver: driver.find_element_by_class_name("continue-payment"))

        # Click back then click the enroll now button again to assert back button behavior
        self.selenium.back()
        self.wait().click(lambda driver: driver.find_element_by_class_name("enroll-button"))
        self.assert_console_logs()

        # Click 'Continue' on the order summary page
        with patch('ecommerce.views.enroll_user_on_success', autospec=True):
            self.wait().click(lambda driver: driver.find_element_by_class_name("continue-payment"))

            self.assert_console_logs()
            self.wait().until(lambda driver: driver.find_element_by_class_name("status-message"))

        # Assert that the purchase went through fine but enrolling in edX failed
        # Which makes sense since there is no edX for these tests
        assert self.selenium.find_element_by_css_selector(".course-status-messages .status-message .message").text == (
            "Something went wrong. You paid for this course but are not enrolled. Contact us for help."
        )
        self.assert_console_logs()


class LearnerTests(SeleniumTestsBase):
    """Tests for learner search"""

    @classmethod
    def setUpTestData(cls):
        """
        Do setup common to learner tests.
        """
        super().setUpTestData()
        # Create a second program that we aren't viewing users from other programs
        cls.other_program = ProgramFactory.create(live=True)

        for program in [cls.program, cls.other_program]:
            Role.objects.create(
                user=cls.user,
                program=program,
                role=Staff.ROLE_ID,
            )

        page_size = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE
        with mute_signals(post_save):
            # Create enough profiles for two pages, but make the second page slightly smaller than the first
            # So we can assert that we're on the second page by counting the results
            for i in range((page_size * 2) - 5):
                user = cls.create_user()
                ProgramEnrollment.objects.create(program=cls.program, user=user)

                if i % 2 == 0:
                    # Some of the users are also enrolled in the other program
                    ProgramEnrollment.objects.create(program=cls.other_program, user=user)
                else:
                    # Others don't overlap
                    for _ in range(2):
                        ProgramEnrollment.objects.create(
                            program=cls.other_program,
                            user=cls.create_user(),
                        )

        ProgramEnrollment.objects.create(
            user=cls.user,
            program=cls.other_program,
        )

        # Update for new users and new role
        index_program_enrolled_users(ProgramEnrollment.objects.iterator())

    def setUp(self):
        """Login the user before each test"""
        super().setUp()
        self.login_via_admin(self.user)

    def test_learners(self):
        """
        Learners page should contain the appropriate number of items on each page
        """
        self.get("/")

        self.get("/learners")
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))
        page_size = settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE
        assert self.num_elements_on_page('.learner-result') == page_size
        self.selenium.find_elements_by_class_name('sk-pagination-option')[1].click()

        def verify_num_elements(driver):
            """Verify that second page has 5 less elements"""
            actual_size = self.num_elements_on_page('.learner-result', driver=driver)
            return actual_size == page_size - 5
        self.wait().until(verify_num_elements)

    def test_react_router(self):
        """Go to profile and back to learners to verify that nothing breaks"""
        self.get("learners")
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))

        self.wait().click(lambda driver: driver.find_element_by_class_name("menu-icon"))
        self.wait().until(
            lambda driver: "open" in driver.find_element_by_class_name("nav-drawer").get_attribute("class")
        )
        profile_link_selector = ".nav-drawer a[href='/learner/{username}']".format(
            username=self.edx_username,
        )
        self.wait().click(lambda driver: driver.find_element_by_css_selector(profile_link_selector))
        self.wait().until(lambda driver: driver.find_element_by_class_name("user-page"))

        # Go back to learners
        self.wait().click(lambda driver: driver.find_element_by_class_name("menu-icon"))
        self.wait().until(
            lambda driver: "open" in driver.find_element_by_class_name("nav-drawer").get_attribute("class")
        )
        self.wait().click(lambda driver: driver.find_element_by_css_selector("a[href='/learners']"))
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))

    def test_query_string_preserved(self):
        """The querystring should not be affected"""
        self.get("/learners/?q=xyz")
        self.wait().until(lambda driver: self.num_elements_on_page('.learner-result', driver=driver) == 0)
        assert self.selenium.current_url.endswith('/learners/?q=xyz')
        self.assert_console_logs()

    def test_switch_program(self):
        """Switching programs should clear facets and show a different set of users"""
        self.get("/learners")
        self.wait().until(lambda driver: driver.find_element_by_class_name('learner-result'))

        assert self.num_elements_on_page('.learner-result') == settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE

        # Switch to other program in menu and assert there are no results
        switcher = self.selenium.find_element_by_css_selector('.micromasters-header .Select-input')
        switcher.send_keys(Keys.DOWN)
        switcher.send_keys(Keys.ENTER)
        # Subtract own user
        count = ProgramEnrollment.objects.filter(program=self.other_program).count() - 1
        self.wait().until(
            lambda driver: driver.find_element_by_css_selector('.result-info span').text == '{} Results'.format(count)
        )

        # Refresh browser and verify the count is the same
        self.get("/learners")
        self.wait().until(
            lambda driver: driver.find_element_by_css_selector('.result-info span').text == '{} Results'.format(count)
        )


class ReviewFinancialAidTests(SeleniumTestsBase):
    """Look at the financial aid review page"""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        Role.objects.create(
            role='staff',
            user=cls.user,
            program=cls.program,
        )

        cls.student = cls.create_user()
        tier_program = TierProgram.objects.get(discount_amount=0)
        FinancialAidFactory.create(
            user=cls.student,
            tier_program=tier_program,
            status=FinancialAidStatus.DOCS_SENT,
        )

    def setUp(self):
        super().setUp()
        self.login_via_admin(self.user)

    def test_approve_docs(self):
        """Test the financial aid review page"""
        self.get("/financial_aid/review/{}/{}".format(self.program.id, FinancialAidStatus.DOCS_SENT))
        self.wait().click(
            # Mark as received
            lambda driver: driver.find_element_by_css_selector(".mark-docs-as-received")
        )
        with patch('mail.api.MailgunClient._mailgun_request'):
            alert = self.selenium.switch_to_alert()
            alert.accept()

            self.wait().until(lambda driver: driver.find_element_by_css_selector(".alert-success"))

        def is_now_pending(driver):  # pylint: disable=unused-argument
            """Wait until the change to the financial aid takes effect"""
            assert FinancialAid.objects.count() == 1
            financial_aid = FinancialAid.objects.first()
            return financial_aid.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL
        self.wait().until(is_now_pending)


class ProgramPageTests(SeleniumTestsBase):
    """Look at the program page"""

    def test_program_page(self):  # pylint: disable=too-many-locals
        """Test viewing the program page"""
        self.login_via_admin(self.user)

        CourseFactory.create_batch(2, program=self.program)

        page = ProgramPageFactory.create(program=self.program, title="A Program Title")
        faculty = FacultyFactory.create_batch(3, program_page=page)
        info_links = InfoLinksFactory.create_batch(3, program_page=page)
        semester_dates = SemesterDateFactory.create_batch(3, program_page=page)
        courses = self.program.course_set.all()
        program_courses = ProgramCourseFactory.create_batch(len(courses), program_page=page, course=Iterator(courses))

        self.get("/a-program-title/")

        faculty_elements = self.selenium.find_elements_by_css_selector(".faculty-tile")
        assert len(faculty) == len(faculty_elements)

        info_elements = self.selenium.find_elements_by_css_selector(".program-contact-link")
        assert len(info_links) == len(info_elements)

        semester_elements = self.selenium.find_elements_by_css_selector(".semester-date")
        assert len(semester_dates) == len(semester_elements)

        program_course_elements = self.selenium.find_elements_by_css_selector(".program-course .title")
        assert len(program_courses) == len(program_course_elements)
