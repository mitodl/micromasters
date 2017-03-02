"""
Tests for mail utils
"""

from unittest.mock import Mock
from django.core.exceptions import ValidationError
from requests import Response
from rest_framework import status

from dashboard.models import ProgramEnrollment
from ecommerce.factories import CoursePriceFactory
from financialaid.api import get_formatted_course_price
from financialaid.constants import (
    FINANCIAL_AID_APPROVAL_MESSAGE,
    FINANCIAL_AID_APPROVAL_SUBJECT,
    FINANCIAL_AID_DOCUMENTS_RECEIVED_SUBJECT,
    FINANCIAL_AID_DOCUMENTS_RECEIVED_MESSAGE,
    FINANCIAL_AID_DOCUMENTS_RESET_MESSAGE,
    FINANCIAL_AID_RESET_SUBJECT,
    FINANCIAL_AID_EMAIL_BODY,
    FinancialAidStatus
)
from financialaid.factories import FinancialAidFactory
from mail.utils import generate_financial_aid_email, generate_mailgun_response_json
from mail.views_test import mocked_json
from search.base import MockedESTestCase


class MailUtilsTests(MockedESTestCase):
    """
    Tests for mail utils
    """
    @classmethod
    def setUpTestData(cls):
        cls.course_price = CoursePriceFactory.create(
            is_valid=True
        )
        cls.financial_aid = FinancialAidFactory.create()
        cls.tier_program = cls.financial_aid.tier_program
        cls.tier_program.program = cls.course_price.course_run.course.program
        cls.tier_program.save()
        cls.program_enrollment = ProgramEnrollment.objects.create(
            user=cls.financial_aid.user,
            program=cls.tier_program.program
        )

    def setUp(self):
        self.financial_aid.refresh_from_db()

    def test_generate_financial_aid_email_approved(self):
        """
        Tests generate_financial_aid_email() with status APPROVED
        """
        self.financial_aid.status = FinancialAidStatus.APPROVED
        self.financial_aid.save()
        email_dict = generate_financial_aid_email(self.financial_aid)
        assert email_dict["subject"] == FINANCIAL_AID_APPROVAL_SUBJECT.format(
            program_name=self.financial_aid.tier_program.program.title
        )
        assert email_dict["body"] == FINANCIAL_AID_EMAIL_BODY.format(
            first_name=self.financial_aid.user.profile.first_name,
            message=FINANCIAL_AID_APPROVAL_MESSAGE.format(
                program_name=self.financial_aid.tier_program.program.title,
                price=get_formatted_course_price(self.program_enrollment)["price"]
            ),
            program_name=self.financial_aid.tier_program.program.title
        )

    def test_generate_financial_aid_email_reset(self):
        """
        Tests generate_financial_aid_email() with status RESET.
        """
        self.financial_aid.status = FinancialAidStatus.RESET
        self.financial_aid.save()
        email_dict = generate_financial_aid_email(self.financial_aid)
        assert email_dict["subject"] == FINANCIAL_AID_RESET_SUBJECT.format(
            program_name=self.financial_aid.tier_program.program.title
        )
        assert FINANCIAL_AID_DOCUMENTS_RESET_MESSAGE in email_dict["body"]

    def test_generate_financial_aid_email_docs_sent(self):
        """
        Tests generate_financial_aid_email() with status PENDING_MANUAL_APPROVAL
        """
        self.financial_aid.status = FinancialAidStatus.PENDING_MANUAL_APPROVAL
        self.financial_aid.save()
        email_dict = generate_financial_aid_email(self.financial_aid)
        assert email_dict["subject"] == FINANCIAL_AID_DOCUMENTS_RECEIVED_SUBJECT.format(
            program_name=self.financial_aid.tier_program.program.title
        )
        assert email_dict["body"] == FINANCIAL_AID_EMAIL_BODY.format(
            first_name=self.financial_aid.user.profile.first_name,
            message=FINANCIAL_AID_DOCUMENTS_RECEIVED_MESSAGE,
            program_name=self.financial_aid.tier_program.program.title
        )

    def test_generate_financial_aid_email_invalid_statuses(self):
        """
        Tests generate_financial_aid_email() with invalid statuses raises django ValidationError
        """
        invalid_statuses = [
            FinancialAidStatus.AUTO_APPROVED,
            FinancialAidStatus.CREATED,
            FinancialAidStatus.PENDING_DOCS
        ]
        for invalid_status in invalid_statuses:
            self.financial_aid.status = invalid_status
            self.financial_aid.save()
            self.assertRaises(ValidationError, generate_financial_aid_email, self.financial_aid)

    def test_generate_mailgun_response_json(self):
        """
        Tests that generate_mailgun_response_json() returns response.json()
        """
        response = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        assert generate_mailgun_response_json(response) == response.json()

    def test_generate_mailgun_response_json_with_failed_json_call(self):
        """
        Tests that generate_mailgun_response_json() returns without erroring if Response.json() call fails for
        non 401 status code
        """
        # Response.json() error
        response = Mock(
            spec=Response,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            json=lambda: (_ for _ in []).throw(ValueError),  # To get .json() to throw ValueError
            reason="reason"
        )
        self.assertDictEqual(
            generate_mailgun_response_json(response),
            {"message": response.reason}
        )
