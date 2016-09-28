"""
Tests for financialaid view
"""
from unittest.mock import Mock, patch

from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from financialaid.api_test import FinancialAidBaseTestCase
from financialaid.constants import (
    FINANCIAL_AID_REJECTION_SUBJECT_TEXT,
    FINANCIAL_AID_REJECTION_MESSAGE_BODY,
    FINANCIAL_AID_APPROVAL_SUBJECT_TEXT,
    FINANCIAL_AID_APPROVAL_MESSAGE_BODY,
    FINANCIAL_AID_DOCUMENTS_SUBJECT_TEXT,
    FINANCIAL_AID_DOCUMENTS_MESSAGE_BODY
)
from financialaid.factories import (
    FinancialAidFactory,
    TierProgramFactory
)
from financialaid.models import (
    FinancialAid,
    FinancialAidStatus,
    FinancialAidAudit
)
from mail.views_test import mocked_json


class FinancialAidViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.request_url = reverse("financial_aid_request")
        cls.review_url = reverse("review_financial_aid", kwargs={"program_id": cls.program.id})
        cls.review_url_with_filter = reverse(
            "review_financial_aid",
            kwargs={
                "program_id": cls.program.id,
                "status": FinancialAidStatus.AUTO_APPROVED
            }
        )
        # This class of tests requires no FinancialAid objects already exist
        FinancialAid.objects.all().delete()

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
        Tests FinancialAidRequestView post endpoint for not-auto-approval
        """
        assert FinancialAid.objects.count() == 0
        assert FinancialAidAudit.objects.count() == 0
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_201_CREATED, data=self.data)
        assert FinancialAid.objects.count() == 1
        assert FinancialAidAudit.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        assert financial_aid.tier_program == self.tier_programs["50k"]
        assert financial_aid.status == FinancialAidStatus.PENDING_DOCS

    def test_income_validation_auto_approved(self):
        """
        Tests FinancialAidRequestView post endpoint for auto-approval
        """
        assert FinancialAid.objects.count() == 0
        assert FinancialAidAudit.objects.count() == 0
        self.data["original_income"] = 200000
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_201_CREATED, data=self.data)
        assert FinancialAid.objects.count() == 1
        assert FinancialAidAudit.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        assert financial_aid.tier_program == self.tier_programs["100k"]
        assert financial_aid.status == FinancialAidStatus.AUTO_APPROVED

    def test_income_validation_missing_args(self):
        """
        Tests FinancialAidRequestView post with missing args
        """
        # Don't send original_currency
        data = {key: value for key, value in self.data.items() if key != "original_currency"}
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=data)
        # Don't send program_id
        data = {key: value for key, value in self.data.items() if key != "program_id"}
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=data)
        # Don't send original_income
        data = {key: value for key, value in self.data.items() if key != "original_income"}
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=data)

    def test_income_validation_no_financial_aid_availability(self):
        """
        Tests FinancialAidRequestView post when financial aid not available for program
        """
        self.program.financial_aid_availability = False
        self.program.save()
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_income_validation_user_not_enrolled(self):
        """
        Tests FinancialAidRequestView post when User not enrolled in program
        """
        self.program_enrollment.user = self.profile2.user
        self.program_enrollment.save()
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_income_validation_currency_not_usd(self):
        """
        Tests FinancialAidRequestView post; only takes USD
        """
        self.data["original_currency"] = "NOTUSD"
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_review_financial_aid_view_not_allowed_user(self):
        """
        Tests ReviewFinancialAidView that are not allowed for a user
        """
        # Not allowed for default logged-in user
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)
        # Not allowed for staff of different program
        self.client.force_login(self.staff_user_profile2.user)
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)
        # Not allowed for instructors
        self.client.force_login(self.instructor_user_profile.user)
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)
        # Not allowed for not-logged-in user
        self.client.logout()
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)

    def test_review_financial_aid_view_not_allowed_program(self):
        """
        Tests ReviewFinancialAidView that are not allowed for the program
        """
        self.client.force_login(self.staff_user_profile.user)
        # Not allowed for financial_aid_availability == False
        self.program.financial_aid_availability = False
        self.program.save()
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_404_NOT_FOUND)
        # Not allowed for live == False
        self.program.financial_aid_availability = True
        self.program.live = False
        self.program.save()
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_404_NOT_FOUND)
        # Reset program
        self.program.live = True
        self.program.save()
        # No valid course_price will raise ImproperlyConfigured
        self.course_price.is_valid = False
        self.course_price.save()
        self.assertRaises(ImproperlyConfigured, self.client.get, self.review_url)
        # Reset course price
        self.course_price.is_valid = True
        self.course_price.save()

    def test_review_financial_aid_view_allowed(self):
        """
        Tests ReviewFinancialAidView that are allowed
        """
        # Allowed for staff of program
        self.client.force_login(self.staff_user_profile.user)
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_200_OK)

    def test_review_financial_aid_view_with_filter_and_sorting(self):
        """
        Tests ReviewFinancialAidView with filters and sorting
        """
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"], status=FinancialAidStatus.AUTO_APPROVED)
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"], status=FinancialAidStatus.APPROVED)
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"], status=FinancialAidStatus.REJECTED)
        self.client.force_login(self.staff_user_profile.user)
        # Should work a filter
        resp = self.assert_http_status(self.client.get, self.review_url_with_filter, status.HTTP_200_OK)
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.AUTO_APPROVED
        ).order_by("user__profile__first_name").values_list("id", flat=True)  # Default sort field
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))
        # Should work with sorting
        url_with_sorting = "{url}?sort_by=-last_name".format(url=self.review_url)
        resp = self.assert_http_status(self.client.get, url_with_sorting, status.HTTP_200_OK)
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL  # Default filter field
        ).order_by("-user__profile__last_name").values_list("id", flat=True)
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))
        # Should work a filter and sorting
        url_with_filter_and_sorting = "{url}?sort_by=-last_name".format(url=self.review_url_with_filter)
        resp = self.assert_http_status(self.client.get, url_with_filter_and_sorting, status.HTTP_200_OK)
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
        url_with_bad_sort_field = "{url}?sort_by=-askjdf".format(url=self.review_url_with_filter)
        self.assert_http_status(self.client.get, url_with_bad_sort_field, status.HTTP_200_OK)
        # Shouldn't break with invalid filter field
        url_with_bad_filter = reverse(
            "review_financial_aid",
            kwargs={
                "program_id": self.program.id,
                "status": "aksdjfk"
            }
        )
        self.assert_http_status(self.client.get, url_with_bad_filter, status.HTTP_200_OK)
        # Shouldn't break with invalid filter and sort fields
        url_with_bad_filter_and_bad_sorting = "{url}?sort_by=-askjdf".format(url=url_with_bad_filter)
        self.assert_http_status(self.client.get, url_with_bad_filter_and_bad_sorting, status.HTTP_200_OK)


@patch("financialaid.serializers.MailgunClient")  # pylint: disable=missing-docstring
class FinancialAidActionTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views
    """
    def setUp(self):
        super().setUp()
        self.financialaid = FinancialAidFactory.create(
            user=self.profile.user,
            tier_program=self.tier_programs["15k"],
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL
        )
        self.action_url = reverse("financial_aid_action", kwargs={"financial_aid_id": self.financialaid.id})
        self.client.force_login(self.staff_user_profile.user)
        self.data = {
            "financial_aid_id": self.financialaid.id,
            "action": FinancialAidStatus.APPROVED,
            "tier_program_id": self.financialaid.tier_program.id
        }

    def test_not_allowed(self, *args):  # pylint: disable=unused-argument
        """
        Tests FinancialAidActionView that are not allowed
        """
        # Not allowed for default logged-in user
        self.client.force_login(self.profile.user)
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)
        # Not allowed for staff of different program
        self.client.force_login(self.staff_user_profile2.user)
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)
        # Not allowed for instructors (regardless of program)
        self.client.force_login(self.instructor_user_profile.user)
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)
        # Not allowed for logged-out user
        self.client.logout()
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_invalid_action(self, *args):  # pylint: disable=unused-argument
        """
        Tests FinancialAidActionView when invalid action is posted
        """
        # Invalid action
        self.client.force_login(self.staff_user_profile.user)
        self.data["action"] = FinancialAidStatus.PENDING_DOCS
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_invalid_tier_program(self, *args):  # pylint: disable=unused-argument
        """
        Tests FinancialAidActionView when invalid tier_program is posted
        """
        self.client.force_login(self.staff_user_profile.user)
        self.data["action"] = FinancialAidStatus.APPROVED
        # Not current tier
        self.data["tier_program_id"] = self.tier_programs["150k_not_current"].id
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)
        # Not part of the same program
        self.data["tier_program_id"] = TierProgramFactory.create().id  # Will be part of a different program
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_reject_invalid_status(self, *args):  # pylint: disable=unused-argument
        """
        Tests FinancialAidActionView when trying to reject a FinancialAid that isn't pending manual approval
        """
        # FinancialAid object that cannot be rejected
        self.financialaid.status = FinancialAidStatus.PENDING_DOCS
        self.financialaid.save()
        self.data["action"] = FinancialAidStatus.REJECTED
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_approve_invalid_status(self, *args):  # pylint: disable=unused-argument
        """
        Tests FinancialAidActionView when trying to approve a FinancialAid that isn't pending manual approval
        """
        # FinancialAid object that cannot be approved
        self.data["action"] = FinancialAidStatus.APPROVED
        statuses_to_test = [
            FinancialAidStatus.CREATED,
            FinancialAidStatus.AUTO_APPROVED,
            FinancialAidStatus.PENDING_DOCS,
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.REJECTED
        ]
        for financial_aid_status in statuses_to_test:
            self.financialaid.status = financial_aid_status
            self.financialaid.save()
            self.assert_http_status(self.client.put, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_mark_documents_received_invalid_status(self, *args):  # pylint: disable=unused-argument
        """
        Tests FinancialAidActionView when trying to approve a FinancialAid that isn't pending docs
        """
        # FinancialAid object whose documents cannot received
        self.data["action"] = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        statuses_to_test = [
            FinancialAidStatus.CREATED,
            FinancialAidStatus.AUTO_APPROVED,
            FinancialAidStatus.PENDING_MANUAL_APPROVAL,
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.REJECTED
        ]
        for financial_aid_status in statuses_to_test:
            self.financialaid.status = financial_aid_status
            self.financialaid.save()
            self.assert_http_status(self.client.put, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_approval(self, mock_mailgun_client):
        """
        Tests FinancialAidActionView when application is approved
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        assert self.financialaid.status != FinancialAidStatus.APPROVED
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_200_OK, data=self.data)
        # Application is approved for the tier program in the financial aid object
        self.financialaid.refresh_from_db()
        assert self.financialaid.tier_program == self.tier_programs["15k"]
        assert self.financialaid.status == FinancialAidStatus.APPROVED
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        assert called_kwargs["subject"] == FINANCIAL_AID_APPROVAL_SUBJECT_TEXT
        assert called_kwargs["body"] == FINANCIAL_AID_APPROVAL_MESSAGE_BODY

    def test_approval_different_tier_program(self, mock_mailgun_client):
        """
        Tests FinancialAidActionView when application is approved for a different tier program
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        assert self.financialaid.tier_program != self.tier_programs["50k"]
        assert self.financialaid.status != FinancialAidStatus.APPROVED
        self.data["tier_program_id"] = self.tier_programs["50k"].id
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_200_OK, data=self.data)
        # Application is approved for a different tier program
        self.financialaid.refresh_from_db()
        assert self.financialaid.tier_program == self.tier_programs["50k"]
        assert self.financialaid.status == FinancialAidStatus.APPROVED
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        assert called_kwargs["subject"] == FINANCIAL_AID_APPROVAL_SUBJECT_TEXT
        assert called_kwargs["body"] == FINANCIAL_AID_APPROVAL_MESSAGE_BODY

    def test_rejection(self, mock_mailgun_client):
        """
        Tests FinancialAidActionView when application is rejected
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        assert self.financialaid.tier_program != self.tier_programs["100k"]
        assert self.financialaid.status != FinancialAidStatus.REJECTED
        self.data["action"] = FinancialAidStatus.REJECTED
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_200_OK, data=self.data)
        self.financialaid.refresh_from_db()
        assert self.financialaid.tier_program == self.tier_programs["100k"]
        assert self.financialaid.status == FinancialAidStatus.REJECTED
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        assert called_kwargs["subject"] == FINANCIAL_AID_REJECTION_SUBJECT_TEXT
        assert called_kwargs["body"] == FINANCIAL_AID_REJECTION_MESSAGE_BODY

    def test_mark_documents_received(self, mock_mailgun_client):
        """
        Tests FinancialAidActionView when documents are checked as received
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        # Set status to pending docs
        assert self.financialaid.tier_program == self.tier_programs["15k"]
        self.financialaid.status = FinancialAidStatus.PENDING_DOCS
        self.financialaid.save()
        self.data["action"] = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        # Set action to pending manual approval
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_200_OK, data=self.data)
        self.financialaid.refresh_from_db()
        # Check that the tier does not change:
        assert self.financialaid.tier_program == self.tier_programs["15k"]
        assert self.financialaid.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        assert called_kwargs["subject"] == FINANCIAL_AID_DOCUMENTS_SUBJECT_TEXT
        assert called_kwargs["body"] == FINANCIAL_AID_DOCUMENTS_MESSAGE_BODY


class GetLearnerPriceForCourseTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.course_price_url = reverse("financial_aid_course_price", kwargs={"program_id": cls.program.id})

    def setUp(self):
        super().setUp()
        self.program.refresh_from_db()

    def test_get_learner_price_for_course_not_allowed(self):
        """
        Tests ReviewFinancialAidView that are not allowed
        """
        # Not allowed if not logged in
        resp = self.client.get(self.course_price_url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        # Bad request if not enrolled
        self.client.force_login(self.profile2.user)
        self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_400_BAD_REQUEST)

    def test_get_learner_price_for_enrolled_with_financial_aid(self):
        """
        Tests ReviewFinancialAidView for enrolled user who has approved financial aid
        """
        self.client.force_login(self.enrolled_profile.user)
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "has_financial_aid_request": True,
            "course_price": self.course_price.price - self.financialaid_approved.tier_program.discount_amount,
            "financial_aid_adjustment": True,
            "financial_aid_availability": True
        }
        self.assertDictEqual(resp.data, expected_response)

    def test_get_learner_price_for_enrolled_with_pending_financial_aid(self):
        """
        Tests ReviewFinancialAidView for enrolled user who has pending financial aid
        """
        self.client.force_login(self.enrolled_profile2.user)
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "has_financial_aid_request": True,
            "course_price": self.course_price.price,
            "financial_aid_adjustment": False,
            "financial_aid_availability": True
        }
        self.assertDictEqual(resp.data, expected_response)

    def test_get_learner_price_for_enrolled_with_no_financial_aid_requested(self):
        """
        Tests ReviewFinancialAidView for enrolled user who has no financial aid request
        """
        self.client.force_login(self.enrolled_profile3.user)
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "has_financial_aid_request": False,
            "course_price": self.course_price.price,
            "financial_aid_adjustment": False,
            "financial_aid_availability": True
        }
        self.assertDictEqual(resp.data, expected_response)

    def test_get_learner_price_for_enrolled_but_no_financial_aid_availability(self):
        """
        Tests ReviewFinancialAidView for enrolled user in program without financial aid
        """
        self.client.force_login(self.enrolled_profile3.user)
        self.program.financial_aid_availability = False
        self.program.save()
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "has_financial_aid_request": False,
            "course_price": self.course_price.price,
            "financial_aid_adjustment": False,
            "financial_aid_availability": False
        }
        self.assertDictEqual(resp.data, expected_response)
