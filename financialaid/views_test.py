"""
Tests for financialaid view
"""
from datetime import (
    datetime,
    timedelta
)
from django.core.urlresolvers import reverse

from rest_framework import status
from rest_framework.test import APIClient

from courses.factories import CourseRunFactory
from ecommerce.factories import CoursePriceFactory
from financialaid.api_test import FinancialAidBaseTestCase
from financialaid.factories import FinancialAidFactory
from financialaid.models import (
    FinancialAid,
    FinancialAidStatus
)


class FinancialAidViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.course_run = CourseRunFactory.create(
            enrollment_end=datetime.utcnow() + timedelta(hours=1),
            program=cls.program
        )
        cls.course_price = CoursePriceFactory.create(
            course_run=cls.course_run,
            is_valid=True
        )
        cls.income_validation_url = reverse("financial_aid_request")
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
        self.income_data = {
            "original_currency": "USD",
            "program_id": self.program.id,
            "original_income": 80000
        }

    def test_income_validation_not_auto_approved(self):
        """
        Tests IncomeValidationView post endpoint for not-auto-approval
        """
        assert FinancialAid.objects.count() == 0
        resp = self.client.post(self.income_validation_url, self.income_data, format='json')
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
        self.income_data["original_income"] = 200000
        resp = self.client.post(self.income_validation_url, self.income_data, format='json')
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
            data = {key: value for key, value in self.income_data.items() if key != key_to_not_send}
            resp = self.client.post(self.income_validation_url, data)
            assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_income_validation_no_financial_aid_availability(self):
        """
        Tests IncomeValidationView post when financial aid not available for program
        """
        self.program.financial_aid_availability = False
        self.program.save()
        resp = self.client.post(self.income_validation_url, self.income_data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_income_validation_user_not_enrolled(self):
        """
        Tests IncomeValidationView post when User not enrolled in program
        """
        self.program_enrollment.user = self.profile2.user
        self.program_enrollment.save()
        resp = self.client.post(self.income_validation_url, self.income_data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_income_validation_currency_not_usd(self):
        """
        Tests IncomeValidationView post; only takes USD
        """
        self.income_data["original_currency"] = "NOTUSD"
        resp = self.client.post(self.income_validation_url, self.income_data)
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


class FinancialAidActionTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # Other items
        cls.financialaid = FinancialAidFactory.create(
            user=cls.profile.user,
            tier_program=cls.tier_programs["15k"],
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL
        )
        cls.action_url = reverse("financial_aid_action", kwargs={"financial_aid_id": cls.financialaid.id})

    def setUp(self):
        super().setUp()
        self.client.force_login(self.profile.user)
        self.financial_review_data = {
            "financial_aid_id": self.financialaid.id,
            "action": FinancialAidStatus.APPROVED,
            "tier_program_id": self.financialaid.tier_program.id
        }

    def test_financial_aid_action_view_not_allowed(self):
        """
        Tests FinancialAidActionView that are not allowed
        """
        # Not allowed for default logged-in user
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        # Not allowed for staff of different program
        self.client.force_login(self.staff_user_profile2.user)
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        # Not allowed for instructors (regardless of program)
        self.client.force_login(self.instructor_user_profile.user)
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        # Not allowed for logged-out user
        self.client.logout()
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_financial_aid_action_view_with_approval(self):
        """
        Tests FinancialAidActionView when application is approved
        """
        # Application is approved for the tier program in the financial aid object
        self.client.force_login(self.staff_user_profile.user)
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_200_OK
        financialaid = FinancialAid.objects.get(id=self.financialaid.id)
        assert financialaid.tier_program == self.tier_programs["15k"]
        assert financialaid.status == FinancialAidStatus.APPROVED
        # Application is approved for a different tier program
        financialaid.status = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        financialaid.save()
        self.financial_review_data["tier_program_id"] = self.tier_programs["50k"].id
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        # Re-retrieve financialaid object
        financialaid = FinancialAid.objects.get(id=self.financialaid.id)
        assert resp.status_code == status.HTTP_200_OK
        assert financialaid.tier_program == self.tier_programs["50k"]
        assert financialaid.status == FinancialAidStatus.APPROVED

    def test_financial_aid_action_view_with_rejection(self):
        """
        Tests FinancialAidActionView when application is rejected
        """
        self.financial_review_data["action"] = FinancialAidStatus.REJECTED
        self.client.force_login(self.staff_user_profile.user)
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_200_OK
        financialaid = FinancialAid.objects.get(id=self.financialaid.id)
        assert financialaid.tier_program == self.tier_programs["100k"]
        assert financialaid.status == FinancialAidStatus.REJECTED

    def test_financial_aid_action_view_with_invalid_data(self):
        """
        Tests FinancialAidActionView when invalid data is posted
        """
        # Invalid action
        self.financial_review_data["action"] = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        self.client.force_login(self.staff_user_profile.user)
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        # Invalid tier
        self.financial_review_data["action"] = FinancialAidStatus.APPROVED
        self.financial_review_data["tier_program_id"] = self.tier_programs["150k_not_current"]
        resp = self.client.post(self.action_url, data=self.financial_review_data)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
