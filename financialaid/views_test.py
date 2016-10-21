"""
Tests for financialaid view
"""
import datetime
from unittest.mock import Mock, patch

import ddt
from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from courses.models import Program
from dashboard.models import ProgramEnrollment
from financialaid.api import (
    determine_income_usd,
    determine_tier_program,
    get_formatted_course_price,
)
from financialaid.api_test import (
    create_program,
    create_enrolled_profile,
    FinancialAidBaseTestCase,
)
from financialaid.constants import (
    FinancialAidJustification,
    FinancialAidStatus
)
from financialaid.factories import (
    FinancialAidFactory,
    TierProgramFactory
)
from financialaid.models import (
    FinancialAid,
    FinancialAidAudit,
    CurrencyExchangeRate
)
from mail.utils import generate_financial_aid_email
from mail.views_test import mocked_json
from roles.models import Staff


class RequestAPITests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views for the request API
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.currency_abc = CurrencyExchangeRate.objects.create(
            currency_code="ABC",
            exchange_rate=3.5
        )
        cls.currency_xyz = CurrencyExchangeRate.objects.create(
            currency_code="XYZ",
            exchange_rate=0.15
        )
        # This class of tests requires no FinancialAid objects already exist
        FinancialAid.objects.all().delete()

    def setUp(self):
        super().setUp()
        self.request_url = reverse("financial_aid_request")
        self.client.force_login(self.profile.user)
        self.data = {
            "original_currency": "USD",
            "program_id": self.program.id,
            "original_income": self.country_income_threshold_50000.income_threshold-1  # Not auto-approved
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
        income_usd = determine_income_usd(self.data["original_income"], self.data["original_currency"])
        assert financial_aid.tier_program == determine_tier_program(self.program, income_usd)
        assert financial_aid.status == FinancialAidStatus.PENDING_DOCS
        assert financial_aid.income_usd == self.data["original_income"]

    def test_income_validation_auto_approved(self):
        """
        Tests FinancialAidRequestView post endpoint for auto-approval
        """
        assert FinancialAid.objects.count() == 0
        assert FinancialAidAudit.objects.count() == 0
        self.data["original_income"] = self.country_income_threshold_50000.income_threshold+1
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_201_CREATED, data=self.data)
        assert FinancialAid.objects.count() == 1
        assert FinancialAidAudit.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        income_usd = determine_income_usd(self.data["original_income"], self.data["original_currency"])
        assert financial_aid.tier_program == determine_tier_program(self.program, income_usd)
        assert financial_aid.status == FinancialAidStatus.AUTO_APPROVED
        assert financial_aid.income_usd == self.data["original_income"]

    def test_income_validation_missing_args(self):
        """
        Tests FinancialAidRequestView post with missing args
        """
        for missing_key in self.data.keys():
            data = {key: value for key, value in self.data.items() if key != missing_key}
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
        ProgramEnrollment.objects.all().delete()
        self.assert_http_status(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_income_validation_currency_not_usd_gto(self):
        """
        Tests FinancialAidRequestView post with a currency that is not USD with exchange rate greater than 1
        """
        self.data["original_currency"] = self.currency_abc.currency_code
        assert FinancialAid.objects.count() == 0
        resp = self.client.post(self.request_url, self.data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert FinancialAid.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        income_usd = determine_income_usd(self.data["original_income"], self.data["original_currency"])
        assert financial_aid.tier_program == determine_tier_program(self.program, income_usd)
        self.assertAlmostEqual(
            financial_aid.income_usd,
            self.data["original_income"] / self.currency_abc.exchange_rate
        )

    def test_income_validation_currency_not_usd_lto(self):
        """
        Tests FinancialAidRequestView post with a currency that is not USD with exchange rate less than 1
        """
        assert FinancialAid.objects.count() == 0
        self.data["original_currency"] = self.currency_xyz.currency_code
        resp = self.client.post(self.request_url, self.data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert FinancialAid.objects.count() == 1
        financial_aid = FinancialAid.objects.first()
        income_usd = determine_income_usd(self.data["original_income"], self.data["original_currency"])
        assert financial_aid.tier_program == determine_tier_program(self.program, income_usd)
        self.assertAlmostEqual(
            financial_aid.income_usd,
            self.data["original_income"] / self.currency_xyz.exchange_rate
        )

    def test_income_validation_currency_not_supported(self):
        """
        Tests FinancialAidRequestView post with a currency not supported
        """
        self.data["original_currency"] = "DEF"
        resp = self.client.post(self.request_url, self.data, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


class ReviewTests(FinancialAidBaseTestCase, APIClient):
    """Tests for the review app"""

    def setUp(self):
        super().setUp()
        self.review_url = reverse("review_financial_aid", kwargs={"program_id": self.program.id})
        self.review_url_with_filter = reverse(
            "review_financial_aid",
            kwargs={
                "program_id": self.program.id,
                "status": FinancialAidStatus.AUTO_APPROVED
            }
        )
        self.client.force_login(self.staff_user_profile.user)

    def test_not_staff(self):
        """
        Not allowed for default logged-in user
        """
        self.client.force_login(self.profile.user)
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)

    def test_staff_of_different_program(self):
        """Not allowed for staff of different program"""
        program = create_program()
        staff_user = create_enrolled_profile(program, role=Staff.ROLE_ID).user
        self.client.force_login(staff_user)
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)

    def test_instructor(self):
        """Not allowed for instructors"""
        self.client.force_login(self.instructor_user_profile.user)
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)

    def test_anonymous(self):
        """Not allowed for not logged in users"""
        self.client.logout()
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_403_FORBIDDEN)

    def test_unavailable_financial_aid(self):
        """
        Not allowed if program doesn't have financial aid
        """
        self.program.financial_aid_availability = False
        self.program.save()
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_404_NOT_FOUND)

    def test_not_live(self):
        """
        Not allowed if program is not live
        """
        self.program.live = False
        self.program.save()
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_404_NOT_FOUND)

    def test_not_valid(self):
        """No valid course_price will raise ImproperlyConfigured"""
        course_price = self.program.course_set.first().courserun_set.first().courseprice_set.first()
        course_price.is_valid = False
        course_price.save()
        self.assertRaises(ImproperlyConfigured, self.client.get, self.review_url)

    def test_review_financial_aid_view_allowed(self):
        """
        Tests ReviewFinancialAidView that are allowed
        """
        # Allowed for staff of program
        self.assert_http_status(self.client.get, self.review_url, status.HTTP_200_OK)

    def test_filter(self):
        """
        Tests ReviewFinancialAidView with filters and sorting
        """
        for _ in range(100):
            FinancialAidFactory.create(
                tier_program=self.tier_programs["0k"],
                status=FinancialAidStatus.AUTO_APPROVED
            )
        # Should work with a filter
        resp = self.assert_http_status(self.client.get, self.review_url_with_filter, status.HTTP_200_OK)
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.AUTO_APPROVED
        ).order_by("user__profile__last_name").values_list("id", flat=True)[:50]  # Default sort field
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))

    def test_sorting(self):
        """Should work with sorting"""
        for _ in range(100):
            FinancialAidFactory.create(
                tier_program=self.tier_programs["0k"],
                status=FinancialAidStatus.AUTO_APPROVED
            )
        url_with_sorting = "{url}?sort_by=-last_name".format(url=self.review_url)
        resp = self.assert_http_status(self.client.get, url_with_sorting, status.HTTP_200_OK)
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL  # Default filter field
        ).order_by("-user__profile__last_name").values_list("id", flat=True)[:50]
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))

    def test_filter_and_sorting(self):
        """Should work with filters and sorting"""
        for _ in range(100):
            FinancialAidFactory.create(
                tier_program=self.tier_programs["0k"],
                status=FinancialAidStatus.AUTO_APPROVED
            )
        url_with_filter_and_sorting = "{url}?sort_by=-last_name".format(url=self.review_url_with_filter)
        resp = self.assert_http_status(self.client.get, url_with_filter_and_sorting, status.HTTP_200_OK)
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.AUTO_APPROVED
        ).order_by("-user__profile__last_name").values_list("id", flat=True)[:50]  # Default sort field
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))

    def test_invalid_sorting(self):
        """
        Shouldn't break with invalid sort field
        """
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"])
        url_with_bad_sort_field = "{url}?sort_by=-askjdf".format(url=self.review_url_with_filter)
        self.assert_http_status(self.client.get, url_with_bad_sort_field, status.HTTP_200_OK)

    def test_invalid_filter(self):
        """
        Shouldn't break with invalid filter field
        """
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"])
        url_with_bad_filter = reverse(
            "review_financial_aid",
            kwargs={
                "program_id": self.program.id,
                "status": "aksdjfk"
            }
        )
        self.assert_http_status(self.client.get, url_with_bad_filter, status.HTTP_200_OK)

    def test_invalid_sorting_and_filter(self):
        """
        Shouldn't break with invalid sorting and filter
        """
        FinancialAidFactory.create(tier_program=self.tier_programs["0k"])
        url_with_bad_filter = reverse(
            "review_financial_aid",
            kwargs={
                "program_id": self.program.id,
                "status": "aksdjfk"
            }
        )
        url_with_bad_filter_and_bad_sorting = "{url}?sort_by=-askjdf".format(url=url_with_bad_filter)
        self.assert_http_status(self.client.get, url_with_bad_filter_and_bad_sorting, status.HTTP_200_OK)

    def test_review_financial_aid_view_with_search(self):
        """
        Tests that ReviewFinancialAidView returns the expected results with search
        """
        financial_aid = FinancialAidFactory.create(
            tier_program=self.tier_programs["0k"],
            status=FinancialAidStatus.AUTO_APPROVED
        )
        for _ in range(99):
            FinancialAidFactory.create(
                tier_program=self.tier_programs["0k"],
                status=FinancialAidStatus.AUTO_APPROVED
            )

        # Works with search and filter
        search_query = financial_aid.user.profile.first_name
        search_url = "{path}?search_query={search_query}".format(
            path=self.review_url_with_filter,
            search_query=search_query
        )
        resp = self.assert_http_status(self.client.get, search_url, status.HTTP_200_OK)
        resp_obj_id_list = resp.context_data["financial_aid_objects"].values_list("id", flat=True)
        expected_obj_id_list = FinancialAid.objects.filter(
            Q(user__profile__first_name__icontains=search_query) | Q(user__profile__last_name__icontains=search_query),
            tier_program__program_id=self.program.id,
            status=FinancialAidStatus.AUTO_APPROVED
        ).order_by("user__profile__last_name").values_list("id", flat=True)  # Default sort field
        self.assertListEqual(list(resp_obj_id_list), list(expected_obj_id_list))


@ddt.ddt
class FinancialAidActionTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid action API
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.financialaid = FinancialAidFactory.create(
            user=cls.profile.user,
            tier_program=cls.tier_programs["25k"],
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL
        )
        cls.action_url = reverse("financial_aid_action", kwargs={"financial_aid_id": cls.financialaid.id})

    def setUp(self):
        super().setUp()
        self.financialaid.refresh_from_db()
        self.client.force_login(self.staff_user_profile.user)
        self.data = {
            "action": FinancialAidStatus.APPROVED,
            "tier_program_id": self.financialaid.tier_program.id,
            "justification": FinancialAidJustification.NOT_NOTARIZED
        }

    def test_not_allowed_without_staff(self):
        """
        Not allowed for default logged-in user
        """
        self.client.force_login(self.profile.user)
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_not_allowed_staff_of_different_program(self):
        """Not allowed for staff of different program"""
        program = create_program()
        staff_user = create_enrolled_profile(program, role=Staff.ROLE_ID).user
        self.client.force_login(staff_user)
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_not_allowed_instructors(self):
        """Not allowed for instructors (regardless of program)"""
        self.client.force_login(self.instructor_user_profile.user)
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_anonymous(self):
        """Not allowed for logged-out user"""
        self.client.logout()
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_no_action(self):
        """
        If no action is present, there should be a ValidationError
        """
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST)

    @ddt.data(
        *([
            [status] for status in FinancialAidStatus.ALL_STATUSES
            if status not in [FinancialAidStatus.APPROVED, FinancialAidStatus.PENDING_MANUAL_APPROVAL]
        ])
    )
    @ddt.unpack
    def test_invalid_action(self, invalid_status):
        """
        Tests FinancialAidActionView when invalid action is posted
        """
        self.assert_http_status(
            self.client.patch,
            self.action_url,
            status.HTTP_400_BAD_REQUEST,
            data={"action": invalid_status}
        )

    def test_not_current(self):
        """
        Not current tier
        """
        not_current = TierProgramFactory.create(program=self.program, income_threshold=75000, current=False)
        self.data["tier_program_id"] = not_current.id
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_invalid(self):
        """Not part of the same program"""
        self.data["tier_program_id"] = TierProgramFactory.create().id  # Will be part of a different program
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_no_tier_program(self):
        """No tier program"""
        self.data.pop("tier_program_id")
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    @ddt.data(
        *([
            [status] for status in FinancialAidStatus.ALL_STATUSES
            if status != FinancialAidStatus.PENDING_MANUAL_APPROVAL
        ])
    )
    @ddt.unpack
    def test_approve_invalid_status(self, financial_aid_status):
        """
        Tests FinancialAidActionView when trying to approve a FinancialAid that isn't pending manual approval
        """
        self.financialaid.status = financial_aid_status
        self.financialaid.save()
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_approve_invalid_justification(self):
        """
        Tests FinancialAidActionView when trying to approve a FinancialAid with an invalid justification
        """
        self.data["justification"] = "somerandomstring"
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_approve_no_justification(self):
        """There should be a ValidationError if there is no justification"""
        self.data.pop("justification")
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    @ddt.data(
        *([
            [status] for status in FinancialAidStatus.ALL_STATUSES
            if status not in [FinancialAidStatus.PENDING_DOCS, FinancialAidStatus.DOCS_SENT]
        ])
    )
    @ddt.unpack
    def test_mark_documents_received_invalid_status(self, financial_aid_status):
        """
        Tests FinancialAidActionView when trying to approve a FinancialAid that isn't pending docs
        """
        # FinancialAid object whose documents cannot received
        self.financialaid.status = financial_aid_status
        self.financialaid.save()
        self.assert_http_status(
            self.client.patch,
            self.action_url,
            status.HTTP_400_BAD_REQUEST,
            data={"action": FinancialAidStatus.PENDING_MANUAL_APPROVAL}
        )

    @patch("financialaid.serializers.MailgunClient")
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
        assert self.financialaid.justification != FinancialAidJustification.NOT_NOTARIZED
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_200_OK, data=self.data)
        # Application is approved for the tier program in the financial aid object
        self.financialaid.refresh_from_db()
        assert self.financialaid.tier_program == self.tier_programs["25k"]
        assert self.financialaid.status == FinancialAidStatus.APPROVED
        assert self.financialaid.justification == FinancialAidJustification.NOT_NOTARIZED
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        financial_aid_email = generate_financial_aid_email(self.financialaid)
        assert called_kwargs["subject"] == financial_aid_email["subject"]
        assert called_kwargs["body"] == financial_aid_email["body"]

    @patch("financialaid.serializers.MailgunClient")
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
        self.assert_http_status(self.client.patch, self.action_url, status.HTTP_200_OK, data=self.data)
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

    @patch("financialaid.serializers.MailgunClient")
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
        # Set action to pending manual approval from pending-docs
        self.assert_http_status(
            self.client.patch,
            self.action_url,
            status.HTTP_200_OK,
            data={"action": FinancialAidStatus.PENDING_MANUAL_APPROVAL}
        )
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

    @patch("financialaid.serializers.MailgunClient")
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
        # Set action to pending manual approval from pending-docs
        self.assert_http_status(
            self.client.patch,
            self.action_url,
            status.HTTP_200_OK,
            data={"action": FinancialAidStatus.PENDING_MANUAL_APPROVAL}
        )
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


@ddt.ddt
class FinancialAidDetailViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for FinancialAidDetailView
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.financialaid_pending_docs = FinancialAidFactory.create(
            user=cls.profile.user,
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

    def setUp(self):
        super().setUp()
        self.client.force_login(self.profile.user)

    def test_learner_can_indicate_documents_sent(self):
        """
        Tests FinancialAidDetailView for user editing their own financial aid document status
        """
        self.assert_http_status(self.client.patch, self.docs_sent_url, status.HTTP_200_OK, data=self.data)
        self.financialaid_pending_docs.refresh_from_db()
        assert self.financialaid_pending_docs.status == FinancialAidStatus.DOCS_SENT
        assert self.financialaid_pending_docs.date_documents_sent == datetime.date(2016, 9, 25)

    def test_user_does_not_have_permission_to_indicate_documents_sent(self):
        """
        Tests FinancialAidDetailView for user without permission to edit document status
        """
        unpermitted_users_to_test = [
            self.instructor_user_profile.user,
            self.staff_user_profile.user,
            create_enrolled_profile(self.program).user,
        ]
        for unpermitted_user in unpermitted_users_to_test:
            self.client.force_login(unpermitted_user)
            self.assert_http_status(self.client.patch, self.docs_sent_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_anonymous(self):
        """
        Anonymous users can't update status for docs sent
        """
        self.client.logout()
        self.assert_http_status(self.client.patch, self.docs_sent_url, status.HTTP_403_FORBIDDEN, data=self.data)

    @ddt.data(
        *([
            [status] for status in FinancialAidStatus.ALL_STATUSES
            if status != FinancialAidStatus.PENDING_DOCS
        ])
    )
    @ddt.unpack
    def test_correct_status_change_on_indicating_documents_sent(self, financial_aid_status):
        """
        Tests FinancialAidDetailView to ensure status change is always pending-docs to docs-sent
        """
        self.financialaid_pending_docs.status = financial_aid_status
        self.financialaid_pending_docs.save()
        self.assert_http_status(self.client.patch, self.docs_sent_url, status.HTTP_400_BAD_REQUEST, data=self.data)


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
        self.client.force_login(self.profile.user)

    def test_anonymous(self):
        """
        Anonymous users can't use the course price API
        """
        self.client.logout()
        resp = self.client.get(self.course_price_url)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_not_enrolled(self):
        """
        Tests ReviewFinancialAidView that are not allowed
        """
        # Bad request if not enrolled
        program = create_program()
        profile = create_enrolled_profile(program)
        self.client.force_login(profile.user)
        self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_404_NOT_FOUND)

    def test_get_learner_price_for_enrolled_with_financial_aid(self):
        """
        Tests ReviewFinancialAidView for enrolled user who has approved financial aid
        """
        financial_aid = FinancialAidFactory.create(
            user=self.profile.user,
            tier_program=self.tier_programs["25k"],
            status=FinancialAidStatus.APPROVED,
        )
        course_price = self.program.course_set.first().courserun_set.first().courseprice_set.first()
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "program_id": self.program.id,
            "price": course_price.price - financial_aid.tier_program.discount_amount,
            "has_financial_aid_request": True,
            "financial_aid_availability": True
        }
        self.assertDictEqual(resp.data, expected_response)

    def test_get_learner_price_for_enrolled_with_pending_financial_aid(self):
        """
        Tests ReviewFinancialAidView for enrolled user who has pending financial aid
        """
        financial_aid = FinancialAidFactory.create(
            user=self.profile.user,
            tier_program=self.tier_programs["25k"],
            status=FinancialAidStatus.PENDING_MANUAL_APPROVAL,
        )
        course_price = self.program.course_set.first().courserun_set.first().courseprice_set.first()
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "program_id": self.program.id,
            "price": course_price.price - financial_aid.tier_program.discount_amount,
            "has_financial_aid_request": True,
            "financial_aid_availability": True
        }
        self.assertDictEqual(resp.data, expected_response)

    def test_get_learner_price_for_enrolled_with_no_financial_aid_requested(self):
        """
        Tests ReviewFinancialAidView for enrolled user who has no financial aid request
        """
        course_price = self.program.course_set.first().courserun_set.first().courseprice_set.first()
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "program_id": self.program.id,
            "price": course_price.price,
            "has_financial_aid_request": False,
            "financial_aid_availability": True
        }
        self.assertDictEqual(resp.data, expected_response)

    def test_get_learner_price_for_enrolled_but_no_financial_aid_availability(self):
        """
        Tests ReviewFinancialAidView for enrolled user in program without financial aid
        """
        course_price = self.program.course_set.first().courserun_set.first().courseprice_set.first()
        self.program.financial_aid_availability = False
        self.program.save()
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected_response = {
            "program_id": self.program.id,
            "price": course_price.price,
            "has_financial_aid_request": False,
            "financial_aid_availability": False
        }
        self.assertDictEqual(resp.data, expected_response)


@ddt.ddt
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
        self.client.force_login(self.profile.user)

    def test_anonymous(self):
        """
        A user that's logged out should not be able to use the skip financial aid API
        """
        self.client.logout()

    def test_skipped_financialaid_object_created(self):
        """
        Tests that a FinancialAid object with the status "skipped" is created.
        """
        assert FinancialAidAudit.objects.count() == 0
        self.assert_http_status(self.client.patch, self.skip_url, status.HTTP_200_OK)
        assert FinancialAid.objects.count() == 1
        financial_aid = FinancialAid.objects.get(
            user=self.profile.user,
        )
        assert financial_aid.tier_program == self.tier_programs["75k"]
        assert financial_aid.status == FinancialAidStatus.SKIPPED
        # Check logging
        assert FinancialAidAudit.objects.count() == 1

    @ddt.data(
        *([status] for status in set(FinancialAidStatus.ALL_STATUSES) - set(FinancialAidStatus.TERMINAL_STATUSES))
    )
    @ddt.unpack
    def test_skipped_financialaid_object_updated(self, financial_aid_status):
        """
        Tests that an existing FinancialAid object is updated to have the status "skipped"
        """
        financial_aid = FinancialAidFactory.create(
            user=self.profile.user,
            tier_program=self.tier_programs["75k"],
            status=financial_aid_status,
        )

        assert FinancialAidAudit.objects.count() == 0
        self.assert_http_status(self.client.patch, self.skip_url, status.HTTP_200_OK)
        assert FinancialAid.objects.count() == 1
        financial_aid.refresh_from_db()
        assert financial_aid.tier_program == self.tier_programs["75k"]
        assert financial_aid.status == FinancialAidStatus.SKIPPED
        # Check logging
        assert FinancialAidAudit.objects.count() == 1

    @ddt.data(
        *([status] for status in FinancialAidStatus.TERMINAL_STATUSES)
    )
    @ddt.unpack
    def test_financialaid_object_cannot_be_skipped_if_already_terminal_status(self, financial_aid_status):
        """
        Tests that an existing FinancialAid object that has already reached a terminal status cannot be skipped.
        """
        FinancialAidFactory.create(
            user=self.profile.user,
            tier_program=self.tier_programs["25k"],
            status=financial_aid_status,
        )
        self.assert_http_status(self.client.patch, self.skip_url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_if_aid_not_available(self):
        """
        Tests that a FinancialAid object cannot be skipped if program does not have financial
        aid
        """
        self.program.financial_aid_availability = False
        self.program.save()
        self.assert_http_status(self.client.patch, self.skip_url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_if_not_enrolled_in_program(self):
        """
        Tests that a FinancialAid object cannot be skipped if the user is not enrolled in program
        """
        program = create_program()
        url = reverse("financial_aid_skip", kwargs={"program_id": program.id})
        self.assert_http_status(self.client.patch, url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_for_nonexisting_program(self):
        """
        Tests that a FinancialAid object cannot be skipped if that program doesn't exist
        """
        Program.objects.all().delete()
        url = reverse("financial_aid_skip", kwargs={"program_id": 1})
        self.assert_http_status(self.client.patch, url, status.HTTP_404_NOT_FOUND)

    def test_skip_financial_aid_only_put_allowed(self):
        """
        Tests that methods other than PUT/PATCH are not allowed for skipping financial aid
        """
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
        # create a second program
        program = create_program()
        ProgramEnrollment.objects.create(
            program=program,
            user=cls.profile.user,
        )

    def setUp(self):
        super().setUp()
        self.client.force_login(self.profile.user)

    def test_anonymous(self):
        """
        Anonymous users are restricted
        """
        self.client.logout()
        self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_403_FORBIDDEN)

    def test_not_live(self):
        """
        If the program is not live there should not be output in the course price API
        """
        for program in Program.objects.all():
            program.live = False
            program.save()

        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        assert resp.data == []

    def test_no_enrollments(self):
        """
        If there are no enrollments there should not be output in the course price API
        """
        ProgramEnrollment.objects.all().delete()
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        assert resp.data == []

    def test_get_all_course_prices(self):
        """
        Test that the course_price_list route will return a list of formatted course prices
        """
        resp = self.assert_http_status(self.client.get, self.course_price_url, status.HTTP_200_OK)
        assert sorted(resp.data, key=lambda x: x['program_id']) == sorted([
            get_formatted_course_price(enrollment)
            for enrollment in ProgramEnrollment.objects.filter(user=self.profile.user)
        ], key=lambda x: x['program_id'])
