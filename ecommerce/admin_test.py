"""
Tests for ecommerce admin interface
"""
from unittest.mock import Mock

from search.base import MockedESTestCase

from ecommerce.admin import OrderAdmin, LineAdmin
from ecommerce.factories import OrderFactory, LineFactory
from ecommerce.models import OrderAudit
from profiles.factories import UserFactory


class AdminTest(MockedESTestCase):
    """
    Tests specifically whether new FinancialAidAudit object is created when the financial aid
    admin model is changed.
    """
    def test_save_and_log_model(self):
        """
        Tests that the save_model() function on OrderAdmin and LineAdmin create OrderAudit entries
        """
        assert OrderAudit.objects.count() == 0
        order = OrderFactory.create()
        admin = OrderAdmin(model=order, admin_site=Mock())
        mock_request = Mock(user=UserFactory.create())
        admin.save_model(
            request=mock_request,
            obj=admin.model,
            form=Mock(),
            change=Mock()
        )
        assert OrderAudit.objects.count() == 1

        line = LineFactory.create()
        line_admin = LineAdmin(model=line, admin_site=Mock())
        mock_request = Mock(user=UserFactory.create())
        line_admin.save_model(
            request=mock_request,
            obj=line_admin.model,
            form=Mock(),
            change=Mock()
        )
        assert OrderAudit.objects.count() == 2
