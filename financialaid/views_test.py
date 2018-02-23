"""
Tests for financialaid view
"""
from decimal import Decimal
from unittest.mock import Mock, patch

import ddt
from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from backends.edxorg import EdxOrgOAuth2
from courses.models import Program
from dashboard.models import ProgramEnrollment
from financialaid.api import (
    determine_income_usd,
    determine_tier_program,
    get_formatted_course_price,
    get_no_discount_tier_program,
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
    CountryIncomeThreshold,
    CurrencyExchangeRate,
    FinancialAid,
    FinancialAidAudit,
)
from mail.utils import generate_financial_aid_email
from mail.views_test import mocked_json
from micromasters.utils import is_near_now
from roles.models import Role


# pylint: disable=too-many-lines


ABC_EXCHANGE_RATE = 3.5
XYZ_EXCHANGE_RATE = 0.15


@ddt.ddt
class RequestAPITests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for financialaid views for the request API
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.currency_abc = CurrencyExchangeRate.objects.create(
            currency_code="ABC",
            exchange_rate=ABC_EXCHANGE_RATE
        )
        cls.currency_xyz = CurrencyExchangeRate.objects.create(
            currency_code="XYZ",
            exchange_rate=XYZ_EXCHANGE_RATE
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
            "original_income": 50000
        }

    @ddt.data(
        # profile income threshold is 100000 but $0 discount tier is 75000
        [74999, "USD", 100000, False],
        [75000, "USD", 100000, True],
        [75001, "USD", 100000, True],
        # Test around income threshold of 50000. We only auto approve if it's strictly greater than the threshold
        [49999, "USD", 50000, False],
        [50000, "USD", 50000, False],
        [50001, "USD", 50000, True],
        # Test with an exchange rate greater than 1
        [49999 * ABC_EXCHANGE_RATE, "ABC", 50000, False],
        [50000 * ABC_EXCHANGE_RATE, "ABC", 50000, False],
        [50001 * ABC_EXCHANGE_RATE, "ABC", 50000, True],
        # Test with an exchange rate less than 1
        [49999 * XYZ_EXCHANGE_RATE, "XYZ", 50000, False],
        [50000 * XYZ_EXCHANGE_RATE, "XYZ", 50000, False],
        [50001 * XYZ_EXCHANGE_RATE, "XYZ", 50000, True],
    )
    @ddt.unpack
    def test_income_validation(self, original_income, original_currency, income_threshold, auto_approved):
        """
        Tests FinancialAidRequestView post endpoint
        """
        CountryIncomeThreshold.objects.filter(country_code=self.profile.country).update(
            income_threshold=income_threshold
        )
        data = {
            "original_income": original_income,
            "original_currency": original_currency,
            "program_id": self.program.id,
        }
        assert FinancialAid.objects.exclude(status=FinancialAidStatus.RESET).count() == 0
        assert FinancialAidAudit.objects.count() == 0
        self.make_http_request(self.client.post, self.request_url, status.HTTP_201_CREATED, data=data)
        assert FinancialAid.objects.exclude(status=FinancialAidStatus.RESET).count() == 1
        assert FinancialAidAudit.objects.count() == 1
        financial_aid = FinancialAid.objects.exclude(status=FinancialAidStatus.RESET).first()
        income_usd = determine_income_usd(original_income, original_currency)
        assert financial_aid.tier_program == determine_tier_program(self.program, income_usd)
        if not auto_approved:
            assert financial_aid.status == FinancialAidStatus.PENDING_DOCS
        else:
            assert financial_aid.status == FinancialAidStatus.AUTO_APPROVED
        self.assertAlmostEqual(financial_aid.income_usd, income_usd)
        assert financial_aid.user == self.profile.user
        self.assertAlmostEqual(financial_aid.original_income, original_income)
        assert financial_aid.original_currency == original_currency
        assert financial_aid.country_of_income == self.profile.country
        assert financial_aid.country_of_residence == self.profile.country
        assert is_near_now(financial_aid.date_exchange_rate)

    def test_income_validation_missing_args(self):
        """
        Tests FinancialAidRequestView post with missing args
        """
        for missing_key in self.data:
            data = {key: value for key, value in self.data.items() if key != missing_key}
            self.make_http_request(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=data)

    def test_income_validation_no_financial_aid_availability(self):
        """
        Tests FinancialAidRequestView post when financial aid not available for program
        """
        self.program.financial_aid_availability = False
        self.program.save()
        self.make_http_request(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_income_validation_user_not_enrolled(self):
        """
        Tests FinancialAidRequestView post when User not enrolled in program
        """
        ProgramEnrollment.objects.all().delete()
        self.make_http_request(self.client.post, self.request_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_income_validation_currency_not_supported(self):
        """
        Tests FinancialAidRequestView post with a currency not supported
        """
        self.data["original_currency"] = "DEF"
        resp = self.client.post(self.request_url, self.data, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


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
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    @ddt.data(*Role.ASSIGNABLE_ROLES)
    def test_not_allowed_staff_of_different_program(self, role):
        """Not allowed for staff or instructors of different program"""
        program, _ = create_program()
        staff_user = create_enrolled_profile(program, role=role).user
        self.client.force_login(staff_user)
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_not_allowed_instructors(self):
        """Not allowed for instructors (regardless of program)"""
        self.client.force_login(self.instructor_user_profile.user)
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_anonymous(self):
        """Not allowed for logged-out user"""
        self.client.logout()
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_403_FORBIDDEN, data=self.data)

    def test_no_action(self):
        """
        If no action is present, there should be a ValidationError
        """
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST)

    @ddt.data(
        *([
            [status] for status in FinancialAidStatus.ALL_STATUSES
            if status not in [
                FinancialAidStatus.APPROVED,
                FinancialAidStatus.PENDING_MANUAL_APPROVAL,
                FinancialAidStatus.RESET
            ]
        ])
    )
    @ddt.unpack
    def test_invalid_action(self, invalid_status):
        """
        Tests FinancialAidActionView when invalid action is posted
        """
        assert FinancialAidAudit.objects.count() == 0
        self.make_http_request(
            self.client.patch,
            self.action_url,
            status.HTTP_400_BAD_REQUEST,
            data={"action": invalid_status}
        )
        assert FinancialAidAudit.objects.count() == 0

    def test_not_current(self):
        """
        Not current tier
        """
        not_current = TierProgramFactory.create(program=self.program, income_threshold=75000, current=False)
        self.data["tier_program_id"] = not_current.id
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_invalid(self):
        """Not part of the same program"""
        self.data["tier_program_id"] = TierProgramFactory.create().id  # Will be part of a different program
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_no_tier_program(self):
        """No tier program"""
        self.data.pop("tier_program_id")
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

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
        assert FinancialAidAudit.objects.count() == 0
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)
        # assert that FinancialAidAudit object is not created for invalid fa actions.
        assert FinancialAidAudit.objects.count() == 0

    def test_approve_invalid_justification(self):
        """
        Tests FinancialAidActionView when trying to approve a FinancialAid with an invalid justification
        """
        self.data["justification"] = "somerandomstring"
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

    def test_approve_no_justification(self):
        """There should be a ValidationError if there is no justification"""
        self.data.pop("justification")
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_400_BAD_REQUEST, data=self.data)

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
        self.make_http_request(
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
        assert FinancialAidAudit.objects.count() == 0
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_200_OK, data=self.data)
        assert FinancialAidAudit.objects.count() == 1
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
        assert FinancialAidAudit.objects.count() == 0
        assert self.financialaid.tier_program != self.tier_programs["50k"]
        assert self.financialaid.status != FinancialAidStatus.APPROVED
        self.data["tier_program_id"] = self.tier_programs["50k"].id
        self.make_http_request(self.client.patch, self.action_url, status.HTTP_200_OK, data=self.data)
        # Application is approved for a different tier program
        self.financialaid.refresh_from_db()
        assert FinancialAidAudit.objects.count() == 1
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
        assert FinancialAidAudit.objects.count() == 0
        # Set action to pending manual approval from pending-docs
        self.make_http_request(
            self.client.patch,
            self.action_url,
            status.HTTP_200_OK,
            data={"action": FinancialAidStatus.PENDING_MANUAL_APPROVAL}
        )
        self.financialaid.refresh_from_db()
        # Check that the tier does not change:
        assert FinancialAidAudit.objects.count() == 1
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
        assert FinancialAidAudit.objects.count() == 0
        # Set action to pending manual approval from pending-docs
        self.make_http_request(
            self.client.patch,
            self.action_url,
            status.HTTP_200_OK,
            data={"action": FinancialAidStatus.PENDING_MANUAL_APPROVAL}
        )
        self.financialaid.refresh_from_db()
        # Check that the tier does not change:
        assert FinancialAidAudit.objects.count() == 1
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
    @ddt.data(
        *([
            [status] for status in FinancialAidStatus.ALL_STATUSES
            if status != FinancialAidStatus.RESET
        ])
    )
    @ddt.unpack
    def test_reset_financial_aid_review(self, financial_aid_status, mock_mailgun_client):
        """
        Tests FinancialAidActionView, when submitted action is RESET
        """
        mock_mailgun_client.send_financial_aid_email.return_value = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        # Set status to docs sent
        self.financialaid.status = financial_aid_status
        self.financialaid.save()
        assert FinancialAidAudit.objects.count() == 0
        # Set action to pending manual approval from pending-docs
        self.make_http_request(
            self.client.patch,
            self.action_url,
            status.HTTP_200_OK,
            data={"action": FinancialAidStatus.RESET}
        )
        self.financialaid.refresh_from_db()
        # Check that the tier does not change:
        assert FinancialAidAudit.objects.count() == 1
        assert self.financialaid.status == FinancialAidStatus.RESET
        assert mock_mailgun_client.send_financial_aid_email.called
        _, called_kwargs = mock_mailgun_client.send_financial_aid_email.call_args
        assert called_kwargs["acting_user"] == self.staff_user_profile.user
        assert called_kwargs["financial_aid"] == self.financialaid
        financial_aid_email = generate_financial_aid_email(self.financialaid)
        assert called_kwargs["subject"] == financial_aid_email["subject"]
        assert called_kwargs["body"] == financial_aid_email["body"]


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
        Tests that the user can create a skipped FinancialAid if it doesn't already exist
        """
        assert FinancialAidAudit.objects.count() == 0
        assert FinancialAid.objects.exclude(status=FinancialAidStatus.RESET).count() == 0
        self.make_http_request(self.client.patch, self.skip_url, status.HTTP_200_OK)
        assert FinancialAidAudit.objects.count() == 1
        assert FinancialAid.objects.exclude(status=FinancialAidStatus.RESET).count() == 1
        financial_aid = FinancialAid.objects.exclude(status=FinancialAidStatus.RESET).first()
        assert financial_aid.tier_program == get_no_discount_tier_program(self.program)
        assert financial_aid.user == self.profile.user
        assert financial_aid.status == FinancialAidStatus.SKIPPED
        assert is_near_now(financial_aid.date_exchange_rate)
        assert financial_aid.country_of_income == self.profile.country
        assert financial_aid.country_of_residence == self.profile.country

    @ddt.data(
        *([status] for status in (
            set(FinancialAidStatus.ALL_STATUSES) -
            set(FinancialAidStatus.TERMINAL_STATUSES) -
            {FinancialAidStatus.RESET}
        ))
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
        self.make_http_request(self.client.patch, self.skip_url, status.HTTP_200_OK)
        assert FinancialAid.objects.exclude(status=FinancialAidStatus.RESET).count() == 1
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
        self.make_http_request(self.client.patch, self.skip_url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_if_aid_not_available(self):
        """
        Tests that a FinancialAid object cannot be skipped if program does not have financial
        aid
        """
        self.program.financial_aid_availability = False
        self.program.save()
        self.make_http_request(self.client.patch, self.skip_url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_if_not_enrolled_in_program(self):
        """
        Tests that a FinancialAid object cannot be skipped if the user is not enrolled in program
        """
        program, _ = create_program()
        url = reverse("financial_aid_skip", kwargs={"program_id": program.id})
        self.make_http_request(self.client.patch, url, status.HTTP_400_BAD_REQUEST)

    def test_financialaid_object_cannot_be_skipped_for_nonexisting_program(self):
        """
        Tests that a FinancialAid object cannot be skipped if that program doesn't exist
        """
        Program.objects.all().delete()
        url = reverse("financial_aid_skip", kwargs={"program_id": 1})
        self.make_http_request(self.client.patch, url, status.HTTP_404_NOT_FOUND)

    def test_skip_financial_aid_only_put_allowed(self):
        """
        Tests that methods other than PUT/PATCH are not allowed for skipping financial aid
        """
        self.make_http_request(self.client.get, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.make_http_request(self.client.post, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.make_http_request(self.client.head, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.make_http_request(self.client.delete, self.skip_url, status.HTTP_405_METHOD_NOT_ALLOWED)


def decimalize_price(fcp):
    """
    Convert the `price` key in the dictionary from a string to a Decimal
    """
    fcp["price"] = Decimal(fcp["price"])
    return fcp


class CoursePriceListViewTests(FinancialAidBaseTestCase, APIClient):
    """
    Tests for course price list views
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.username = "{}_edx".format(cls.profile.user.username)
        cls.staff_username = "{}_edx".format(cls.staff_user_profile.user.username)
        cls.instructor_username = "{}_edx".format(cls.instructor_user_profile.user.username)
        cls.profile.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid=cls.username,
            extra_data={"access_token": "fooooootoken"}
        )
        cls.staff_user_profile.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid=cls.staff_username,
            extra_data={"access_token": "fooooootoken"}
        )

        cls.course_price_url = reverse("course_price_list", args=[cls.username])
        cls.staff_course_price_url = reverse("course_price_list", args=[cls.staff_username])
        # create a second program
        program, _ = create_program()
        ProgramEnrollment.objects.create(
            program=program,
            user=cls.profile.user,
        )
        # one just for the staff user
        other_program, _ = create_program()
        ProgramEnrollment.objects.create(
            program=other_program,
            user=cls.staff_user_profile.user,
        )

    def setUp(self):
        super().setUp()
        self.client.force_login(self.profile.user)

    def test_anonymous(self):
        """
        Anonymous users are restricted
        """
        self.client.logout()
        self.make_http_request(self.client.get, self.course_price_url, status.HTTP_403_FORBIDDEN)

    def test_not_live(self):
        """
        If the program is not live there should not be output in the course price API
        """
        for program in Program.objects.all():
            program.live = False
            program.save()

        resp = self.make_http_request(self.client.get, self.course_price_url, status.HTTP_200_OK)
        assert resp.data == []

    def test_no_enrollments(self):
        """
        If there are no enrollments there should not be output in the course price API
        """
        ProgramEnrollment.objects.all().delete()
        resp = self.make_http_request(self.client.get, self.course_price_url, status.HTTP_200_OK)
        assert resp.data == []

    def test_get_all_course_prices(self):
        """
        Test that the course_price_list route will return a list of formatted course prices
        which should only include entries from the program the user is enrolled in.
        """
        resp = self.make_http_request(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected = sorted([
            get_formatted_course_price(enrollment)
            for enrollment in ProgramEnrollment.objects.filter(user=self.profile.user)
        ], key=lambda x: x['program_id'])
        actual = sorted([
            decimalize_price(fcp) for fcp in resp.data
        ], key=lambda x: x['program_id'])
        assert actual == expected

    def test_non_staff_cannot_get_another_user(self):
        """
        Learners should not be able to get the data of others
        """
        self.make_http_request(self.client.get, self.staff_course_price_url, status.HTTP_404_NOT_FOUND)

    def test_staff_can_get_other_user(self):
        """
        A staff user should be able to get the data for a learner enrolled in their program
        """
        self.client.force_login(self.staff_user_profile.user)
        resp = self.make_http_request(self.client.get, self.course_price_url, status.HTTP_200_OK)
        expected = sorted([
            get_formatted_course_price(enrollment)
            for enrollment in ProgramEnrollment.objects.filter(user=self.profile.user)
        ], key=lambda x: x['program_id'])
        actual = sorted([
            decimalize_price(fcp) for fcp in resp.data
        ], key=lambda x: x['program_id'])
        assert actual == expected
