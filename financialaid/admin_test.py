"""
Tests for admin.py
"""
from unittest.mock import Mock

from rest_framework.test import APIClient

from financialaid.admin import FinancialAidAdmin
from financialaid.api_test import FinancialAidBaseTestCase
from financialaid.models import FinancialAidAudit


class AdminTest(FinancialAidBaseTestCase, APIClient):
    """
    Tests specifically whether new FinancialAidAudit object is created when the financial aid
    admin model is changed.
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

    def setUp(self):
        super(AdminTest, self).setUp()

    def test_save_and_log_model(self):
        """
        Tests that save_model() function on FinancialAidAdmin admin model creates FinancialAidAudit
        object
        """
        assert FinancialAidAudit.objects.count() == 0
        financial_aid_admin = FinancialAidAdmin(model=self.financialaid_pending, admin_site=Mock())
        mock_request = Mock()
        mock_request.user = self.staff_user_profile.user
        financial_aid_admin.save_model(
            request=mock_request,
            obj=financial_aid_admin.model,
            form=Mock(),
            change=Mock()
        )
        assert FinancialAidAudit.objects.count() == 1
