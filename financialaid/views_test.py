"""
Tests for financialaid view
"""
import datetime
from unittest.mock import Mock, patch

from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from courses.factories import CourseRunFactory
from courses.models import Program
from dashboard.models import ProgramEnrollment
from ecommerce.factories import CoursePriceFactory
from financialaid.api_test import FinancialAidBaseTestCase
from financialaid.factories import (
    FinancialAidFactory,
    TierProgramFactory
)
from financialaid.models import (
    FinancialAid,
    FinancialAidAudit,
    FinancialAidStatus,
    CurrencyExchangeRate
)
from mail.api import generate_financial_aid_email
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
        CurrencyExchangeRate.objects.create(
            currency_code="ABC",
            exchange_rate=1.5
        )
        CurrencyExchangeRate.objects.create(
            currency_code="XYZ",
            exchange_rate=0.76
        )
        # This class of tests requires no FinancialAid objects already exist
        FinancialAid.objects.all().delete()

    def setUp(self):
        super().setUp()
        self.client.force_login(self.profile.user)
        self.data = {
            "original_currency": "USD",
            "program_id": self.program.id,
            "original_income": 70000
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
        assert financial_aid.income_usd == self.data["original_income"]

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
        assert financial_aid.tier_program == self.tier_programs["75k"]
        assert financial_aid.status == FinancialAidStatus.AUTO_APPROVED
        assert financial_aid.income_usd == self.data["original_income"]

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
        Tests IncomeValidationView post with a currency that is not USD
        """
        self.data["original_currency"] = "ABC"
        assert FinancialAid.objects.count() == 0
        resp = self.client.post(self.request_url, self.data, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert FinancialAid.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        exchange_rate = CurrencyExchangeRate.objects.get(currency_code="ABC").exchange_rate
        assert financial_aid.tier_program == self.tier_programs["50k"]
        assert financial_aid.status == FinancialAidStatus.PENDING_DOCS
        self.assertAlmostEqual(financial_aid.income_usd, self.data["original_income"] / exchange_rate)

    def test_income_validation_currency_not_supported(self):
        """
        Tests IncomeValidationView post with a currency not supported
        """
        self.data["original_currency"] = "DEF"
        assert FinancialAid.objects.count() == 0
        resp = self.client.post(self.request_url, self.data, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

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
            tier_program=self.tier_programs["25k"],
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
        self.data["tier_program_id"] = self.tier_programs["75k_not_current"].id
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
        assert self.financialaid.tier_program == self.tier_programs["25k"]
        assert self.financialaid.status == FinancialAidStatus.APPROVED
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        financial_aid_email = generate_financial_aid_email(self.financialaid)
        assert called_kwargs["subject"] == financial_aid_email["subject"]
        assert called_kwargs["body"] == financial_aid_email["body"]

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
        financial_aid_email = generate_financial_aid_email(self.financialaid)
        assert called_kwargs["subject"] == financial_aid_email["subject"]
        assert called_kwargs["body"] == financial_aid_email["body"]

    def test_rejection(self, mock_mailgun_client):
        """
        Tests FinancialAidActionView when application is rejected
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        assert self.financialaid.tier_program != self.tier_programs["75k"]
        assert self.financialaid.status != FinancialAidStatus.REJECTED
        self.data["action"] = FinancialAidStatus.REJECTED
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_200_OK, data=self.data)
        self.financialaid.refresh_from_db()
        assert self.financialaid.tier_program == self.tier_programs["75k"]
        assert self.financialaid.status == FinancialAidStatus.REJECTED
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        financial_aid_email = generate_financial_aid_email(self.financialaid)
        assert called_kwargs["subject"] == financial_aid_email["subject"]
        assert called_kwargs["body"] == financial_aid_email["body"]

    def test_mark_documents_received_pending_docs(self, mock_mailgun_client):
        """
        Tests FinancialAidActionView when documents are checked as received from PENDING_DOCS
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        # Set status to pending docs
        assert self.financialaid.tier_program == self.tier_programs["25k"]
        self.financialaid.status = FinancialAidStatus.PENDING_DOCS
        self.financialaid.save()
        self.data["action"] = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        # Set action to pending manual approval from pending-docs
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_200_OK, data=self.data)
        self.financialaid.refresh_from_db()
        # Check that the tier does not change:
        assert self.financialaid.tier_program == self.tier_programs["25k"]
        assert self.financialaid.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        financial_aid_email = generate_financial_aid_email(self.financialaid)
        assert called_kwargs["subject"] == financial_aid_email["subject"]
        assert called_kwargs["body"] == financial_aid_email["body"]

    def test_mark_documents_received_docs_sent(self, mock_mailgun_client):
        """
        Tests FinancialAidActionView when documents are checked as received from DOCS_SENT
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        # Set status to docs sent
        assert self.financialaid.tier_program == self.tier_programs["25k"]
        self.financialaid.status = FinancialAidStatus.DOCS_SENT
        self.financialaid.save()
        self.data["action"] = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        # Set action to pending manual approval from pending-docs
        self.assert_http_status(self.client.put, self.action_url, status.HTTP_200_OK, data=self.data)
        self.financialaid.refresh_from_db()
        # Check that the tier does not change:
        assert self.financialaid.tier_program == self.tier_programs["25k"]
        assert self.financialaid.status == FinancialAidStatus.PENDING_MANUAL_APPROVAL
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        financial_aid_email = generate_financial_aid_email(self.financialaid)
        assert called_kwargs["subject"] == financial_aid_email["subject"]
        assert called_kwargs["body"] == financial_aid_email["body"]


class FinancialAidDetailViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for FinancialAidDetailView
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.financialaid_pending_docs = FinancialAidFactory.create(
            user=cls.enrolled_profile3.user,
            tier_program=cls.tier_programs["25k"],
            status=FinancialAidStatus.PENDING_DOCS
        )
        cls.docs_sent_url = reverse(
            "financial_aid",
            kwargs={"financial_aid_id": cls.financialaid_pending_docs.id}
        )
        cls.data = {
            "financial_aid_id": cls.financialaid_pending_docs.id,
            "date_documents_sent": datetime.datetime(2016, 9, 25).strftime("%Y-%m-%d")
        }

    def test_learner_can_indicate_documents_sent(self):
        """
        Tests FinancialAidDetailView for user editing their own financial aid document status
        """
        self.client.force_login(self.enrolled_profile3.user)
        self.assert_http_status(self.client.put, self.docs_sent_url, status.HTTP_200_OK, data=self.data)
        self.financialaid_pending_docs.refresh_from_db()
        assert self.financialaid_pending_docs.status == FinancialAidStatus.DOCS_SENT
        assert self.financialaid_pending_docs.date_documents_sent == datetime.date(2016, 9, 25)

    def test_user_does_not_have_permission_to_indicate_documents_sent(self):
        """
        Tests FinancialAidDetailView for user without permission to edit document status
        """
        unpermitted_users_to_test = [
            self.enrolled_profile.user,
            self.instructor_user_profile.user,
            self.staff_user_profile.user,
            self.profile.user
        ]
        for unpermitted_user in unpermitted_users_to_test:
            self.client.force_login(unpermitted_user)
            self.assert_http_status(self.client.put, self.docs_sent_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_correct_status_change_on_indicating_documents_sent(self):
        """
        Tests FinancialAidDetailView to ensure status change is always pending-docs to docs-sent
        """
        statuses_to_test = [
            FinancialAidStatus.CREATED,
            FinancialAidStatus.AUTO_APPROVED,
            FinancialAidStatus.DOCS_SENT,
            FinancialAidStatus.PENDING_MANUAL_APPROVAL,
            FinancialAidStatus.APPROVED,
            FinancialAidStatus.REJECTED
        ]
        for financial_aid_status in statuses_to_test:
            self.financialaid_pending_docs.status = financial_aid_status
            self.financialaid_pending_docs.save()
            self.client.force_login(self.enrolled_profile3.user)
            self.assert_http_status(self.client.put, self.docs_sent_url, status.HTTP_400_BAD_REQUEST, data=self.data)


class CoursePriceDetailViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for course price detail views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.course_price_url = reverse("course_price_detail", kwargs={"program_id": cls.program.id})

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
        self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_404_NOT_FOUND)

    def test_get_learner_price_for_enrolled_with_financial_aid(self):
        """
        Tests ReviewFinancialAidView for enrolled user who has approved financial aid
        """
        self.client.force_login(self.enrolled_profile.user)
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "program_id": self.program.id,
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
            "program_id": self.program.id,
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
            "program_id": self.program.id,
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
            "program_id": self.program.id,
            "has_financial_aid_request": False,
            "course_price": self.course_price.price,
            "financial_aid_adjustment": False,
            "financial_aid_availability": False
        }
        self.assertDictEqual(resp.data, expected_response)


class LearnerSkipsFinancialAid(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financial aid skip views
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.skip_url = reverse("financial_aid_skip", kwargs={"program_id": cls.program.id})

    def setUp(self):
        super().setUp()
        self.program.refresh_from_db()

    def test_skipped_financialaid_object_created(self):
        """
        Tests that a FinancialAid object with the status "skipped" is created.
        """
        self.client.force_login(self.enrolled_profile3.user)
        assert FinancialAidAudit.objects.count() == 0
        # Check number of financial aid objects (two are created at test setup)
        assert FinancialAid.objects.count() == 2
        self.assert_http_status(self.client.put, self.skip_url, status.HTTP_200_OK)
        assert FinancialAid.objects.count() == 3
        financialaid = FinancialAid.objects.get(user=self.enrolled_profile3.user, tier_program__program=self.program)
        assert financialaid.tier_program == self.tier_programs["75k"]
        assert financialaid.status == FinancialAidStatus.SKIPPED
        # Check logging
        assert FinancialAidAudit.objects.count() == 1

    def test_skipped_financialaid_object_updated(self):
        """
        Tests that an existing FinancialAid object is updated to have the status "skipped"
        """
        self.client.force_login(self.enrolled_profile2.user)
        assert FinancialAidAudit.objects.count() == 0
        # Check number of financial aid objects (two are created at test setup)
        assert FinancialAid.objects.count() == 2
        self.assert_http_status(self.client.put, self.skip_url, status.HTTP_200_OK)
        assert FinancialAid.objects.count() == 2
        self.financialaid_pending.refresh_from_db()
        assert self.financialaid_pending.tier_program == self.tier_programs["75k"]
        assert self.financialaid_pending.status == FinancialAidStatus.SKIPPED
        # Check logging
        assert FinancialAidAudit.objects.count() == 1

    def test_financialaid_object_cannot_be_skipped_if_already_terminal_status(self):
        """
        Tests that an existing FinancialAid object that has already reached a terminal status cannot be skipped.
        """
        self.client.force_login(self.enrolled_profile2.user)
        for financial_aid_status in FinancialAidStatus.TERMINAL_STATUSES:
            self.financialaid_pending.status = financial_aid_status
            self.financialaid_pending.save()
            self.assert_http_status(self.client.put, self.skip_url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_if_aid_not_available(self):
        """
        Tests that a FinancialAid object cannot be skipped if program does not have financial
        aid
        """
        self.client.force_login(self.enrolled_profile3.user)
        self.program.financial_aid_availability = False
        self.program.save()
        self.assert_http_status(self.client.put, self.skip_url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_if_not_enrolled_in_program(self):
        """
        Tests that a FinancialAid object cannot be skipped if the user is not enrolled in program
        """
        self.client.force_login(self.enrolled_profile3.user)
        with self.assertRaises(ProgramEnrollment.DoesNotExist):
            ProgramEnrollment.objects.get(user=self.enrolled_profile3.user, program=self.program2)
        url = reverse("financial_aid_skip", kwargs={"program_id": self.program2.id})
        self.assert_http_status(self.client.put, url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_for_nonexisting_program(self):
        """
        Tests that a FinancialAid object cannot be skipped if that program doesn't exist
        """
        self.client.force_login(self.enrolled_profile3.user)
        valid_program_ids = Program.objects.all().values_list("id", flat=True)
        invalid_program_id = 8675305
        assert invalid_program_id not in valid_program_ids
        url = reverse("financial_aid_skip", kwargs={"program_id": invalid_program_id})
        self.assert_http_status(self.client.put, url, status.HTTP_404_NOT_FOUND)

    def test_skip_financial_aid_only_put_allowed(self):
        """
        Tests that methods other than PUT/PATCH are not allowed for skipping financial aid
        """
        self.client.force_login(self.enrolled_profile2.user)
        self.assert_http_status(self.client.get, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assert_http_status(self.client.post, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assert_http_status(self.client.head, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assert_http_status(self.client.delete, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)


class CoursePriceListViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for course price list views
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.course_price_url = reverse("course_price_list")
        cls.course_run2 = CourseRunFactory.create(
            enrollment_end=datetime.datetime.utcnow() + datetime.timedelta(hours=1),
            program=cls.program2
        )
        cls.course_price2 = CoursePriceFactory.create(
            course_run=cls.course_run2,
            is_valid=True
        )

    def test_get_all_course_prices(self):
        """
        Test that the course_price_list route will return a list of formatted course prices
        """
        self.client.force_login(self.multi_enrolled_profile.user)
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        self.assertTrue(isinstance(resp.data, list))
        self.assertEqual(len(resp.data), 2)
