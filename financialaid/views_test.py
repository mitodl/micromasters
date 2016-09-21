"""
Tests for financialaid view
"""
from datetime import (
    datetime,
    timedelta
)
from django.core.urlresolvers import reverse
from django.db.models.signals import post_save

from factory.django import mute_signals
from rest_framework import status
from rest_framework.test import APIClient

from courses.factories import (
    CourseRunFactory,
    ProgramFactory
)
from ecommerce.factories import CoursePriceFactory
from financialaid.api_test import FinancialAidBaseTestCase
from financialaid.factories import FinancialAidFactory
from financialaid.models import (
    FinancialAid,
    FinancialAidStatus
)
from profiles.factories import ProfileFactory
from roles.models import Role
from roles.roles import Staff, Instructor


class FinancialAidViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        with mute_signals(post_save):
            cls.profile2 = ProfileFactory.create()
            cls.staff_user_profile = ProfileFactory.create()
            cls.staff_user_profile2 = ProfileFactory.create()
            cls.instructor_user_profile = ProfileFactory.create()
        # Role for self.staff_user
        Role.objects.create(
            user=cls.staff_user_profile.user,
            program=cls.program,
            role=Staff.ROLE_ID,
        )
        # Role for self.staff_user_profile2.user
        cls.program2 = ProgramFactory.create(
            financial_aid_availability=True,
            live=True
        )
        Role.objects.create(
            user=cls.staff_user_profile2.user,
            program=cls.program2,
            role=Staff.ROLE_ID
        )
        # Role for self.instructor
        Role.objects.create(
            user=cls.instructor_user_profile.user,
            program=cls.program,
            role=Instructor.ROLE_ID
        )
        # Other items
        cls.course_run = CourseRunFactory.create(
            enrollment_end=datetime.utcnow() + timedelta(hours=1),
            program=cls.program
        )
        cls.course_price = CoursePriceFactory.create(
            course_run=cls.course_run,
            is_valid=True
        )
        cls.income_validation_url = reverse("financialaid_api")
        cls.review_url = reverse("review_financial_aid", kwargs={"program_id": cls.program.id})
        cls.review_url_with_filter = reverse(
            "review_financial_aid",
            kwargs={
                "program_id": cls.program.id,
                "status": FinancialAidStatus.AUTO_APPROVED
            }
        )

    def setUp(self):
        super().setUp()
        self.client.force_login(self.profile.user)
        self.data = {
            "original_currency": "USD",
            "program_id": self.program.id,
            "original_income": 80000
        }

    def test_income_validation_not_auto_approved(self):
        """
        Tests IncomeValidationView post endpoint for not-auto-approval
        """
        assert FinancialAid.objects.count() == 0
        resp = self.client.post(self.income_validation_url, self.data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert FinancialAid.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        assert financial_aid.tier_program == self.tier_programs["50k"]
        assert financial_aid.status == FinancialAidStatus.PENDING_DOCS

    def test_income_validation_auto_approved(self):
        """
        Tests IncomeValidationView post endpoint for auto-approval
        """
        assert FinancialAid.objects.count() == 0
        self.data["original_income"] = 200000
        resp = self.client.post(self.income_validation_url, self.data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert FinancialAid.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        assert financial_aid.tier_program == self.tier_programs["100k"]
        assert financial_aid.status == FinancialAidStatus.AUTO_APPROVED

    def test_income_validation_missing_args(self):
        """
        Tests IncomeValidationView post with missing args
        """
        for key_to_not_send in ["original_currency", "program_id", "original_income"]:
            data = {key: value for key, value in self.data.items() if key != key_to_not_send}
            resp = self.client.post(self.income_validation_url, data)
            assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_income_validation_no_financial_aid_availability(self):
        """
        Tests IncomeValidationView post when financial aid not available for program
        """
        self.program.financial_aid_availability = False
        self.program.save()
        resp = self.client.post(self.income_validation_url, self.data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_income_validation_user_not_enrolled(self):
        """
        Tests IncomeValidationView post when User not enrolled in program
        """
        self.program_enrollment.user = self.profile2.user
        self.program_enrollment.save()
        resp = self.client.post(self.income_validation_url, self.data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_income_validation_currency_not_usd(self):
        """
        Tests IncomeValidationView post; only takes USD
        """
        self.data["original_currency"] = "NOTUSD"
        resp = self.client.post(self.income_validation_url, self.data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_review_financial_aid_view_not_allowed_user(self):
        """
        Tests ReviewFinancialAidView that are not allowed for a user
        """
        # Not allowed for default logged-in user
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        # Not allowed for staff of different program
        self.client.force_login(self.staff_user_profile2.user)
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        # Not allowed for instructors
        self.client.force_login(self.instructor_user_profile.user)
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        # Not allowed for not-logged-in user
        self.client.logout()
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_review_financial_aid_view_not_allowed_program(self):
        """
        Tests ReviewFinancialAidView that are not allowed for the program
        """
        self.client.force_login(self.staff_user_profile.user)
        # Not allowed for financial_aid_availability == False
        self.program.financial_aid_availability = False
        self.program.save()
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        # Not allowed for live == False
        self.program.financial_aid_availability = True
        self.program.live = False
        self.program.save()
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        # Reset program
        self.program.live = True
        self.program.save()
        # No valid course_price will return 200, but empty queryset
        self.course_price.is_valid = False
        self.course_price.save()
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.context_data["financial_aid_objects"] == []
        # Reset course price
        self.course_price.is_valid = True
        self.course_price.save()

    def test_review_financial_aid_view_allowed(self):
        """
        Tests ReviewFinancialAidView that are allowed
        """
        # Allowed for staff of program
        self.client.force_login(self.staff_user_profile.user)
        resp = self.client.get(self.review_url)
        assert resp.status_code == status.HTTP_200_OK

    def test_review_financial_aid_view_with_filter_and_sorting(self):
        """
        Tests ReviewFinancialAidView with filters and sorting
        """
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"], status=FinancialAidStatus.AUTO_APPROVED)
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"], status=FinancialAidStatus.APPROVED)
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"], status=FinancialAidStatus.REJECTED)
        self.client.force_login(self.staff_user_profile.user)
        # Should work a filter
        resp = self.client.get(self.review_url_with_filter)
        assert resp.status_code == status.HTTP_200_OK
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.AUTO_APPROVED
        ).order_by("user__profile__first_name").values_list("id", flat=True)  # Default sort field
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))
        # Should work with sorting
        url_with_sorting = "{url}?sort_by=-last_name".format(url=self.review_url)
        resp = self.client.get(url_with_sorting)
        assert resp.status_code == status.HTTP_200_OK
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL  # Default filter field
        ).order_by("-user__profile__last_name").values_list("id", flat=True)
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))
        # Should work a filter and sorting
        url_with_filter_and_sorting = "{url}?sort_by=-last_name".format(url=self.review_url_with_filter)
        resp = self.client.get(url_with_filter_and_sorting)
        assert resp.status_code == status.HTTP_200_OK
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.AUTO_APPROVED
        ).order_by("-user__profile__last_name").values_list("id", flat=True)  # Default sort field
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))

    def test_review_financial_aid_view_with_invalid_filter_and_sorting(self):
        """
        Tests that ReviewFinancialAidView does not break with invalid filters and sorting
        """
        self.client.force_login(self.staff_user_profile.user)
        # Shouldn't break with invalid sort field
        url_with_filter_and_sorting = "{url}?sort_by=-askjdf".format(url=self.review_url_with_filter)
        resp = self.client.get(url_with_filter_and_sorting)
        assert resp.status_code == status.HTTP_200_OK
        # Shouldn't break with invalid filter field
        url_with_bad_filter = reverse(
            "review_financial_aid",
            kwargs={
                "program_id": self.program.id,
                "status": "aksdjfk"
            }
        )
        resp = self.client.get(url_with_bad_filter)
        assert resp.status_code == status.HTTP_200_OK
        # Shouldn't break with invalid filter and sort fields
        url_with_bad_filter_and_bad_sorting = "{url}?sort_by=-askjdf".format(url=url_with_bad_filter)
        resp = self.client.get(url_with_bad_filter_and_bad_sorting)
        assert resp.status_code == status.HTTP_200_OK
