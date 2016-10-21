"""
Tests for admin.py
"""
from unittest.mock import Mock

from financialaid.admin import FinancialAidAdmin
from financialaid.api_test import FinancialAidBaseTestCase
from financialaid.factories import FinancialAidFactory
from financialaid.models import FinancialAidAudit


class AdminTest(FinancialAidBaseTestCase):
    """
    Tests specifically whether new FinancialAidAudit object is created when the financial aid
    admin model is changed.
    """
    def test_save_and_log_model(self):
        """
        Tests that the save_model() function on FinancialAidAdmin model creates FinancialAidAudit
        object
        """
        financial_aid = FinancialAidFactory.create()
        assert FinancialAidAudit.objects.count() == 0
        financial_aid_admin = FinancialAidAdmin(model=financial_aid, admin_site=Mock())
        mock_request = Mock(user=self.staff_user_profile.user)
        financial_aid_admin.save_model(
            request=mock_request,
            obj=financial_aid_admin.model,
            form=Mock(),
            change=Mock()
        )
        assert FinancialAidAudit.objects.count() == 1
