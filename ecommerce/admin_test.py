"""
Tests for ecommerce admin interface
"""
from mock import Mock

from search.base import ESTestCase

from ecommerce.admin import OrderAdmin
from ecommerce.factories import OrderFactory
from ecommerce.models import OrderAudit
from profiles.factories import UserFactory


# pylint: disable=no-self-use
class AdminTest(ESTestCase):
    """
    Tests specifically whether new FinancialAidAudit object is created when the financial aid
    admin model is changed.
    """
    def test_save_and_log_model(self):
        """
        Tests that the save_model() function on OrderAdmin creates an OrderAudit entry
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
