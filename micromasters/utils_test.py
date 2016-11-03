"""
Tests for the utils module
"""
import unittest

from django.core.exceptions import ImproperlyConfigured
from django.template import RequestContext
from django.test import (
    override_settings,
    RequestFactory,
    TestCase,
)
from rest_framework import status
from rest_framework.exceptions import ValidationError

from ecommerce.factories import (
    CoursePriceFactory,
    ReceiptFactory,
)
from ecommerce.models import Order
from financialaid.factories import (
    FinancialAidFactory,
)
from micromasters.utils import (
    custom_exception_handler,
    get_field_names,
    serialize_model_object,
)


class ExceptionHandlerTest(TestCase):
    """
    Tests for the custom_exception_handler function.\
    This is a Django Rest framework custom exception handler
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.request = RequestFactory()
        cls.context = RequestContext(cls.request)

    def test_validation_error(self):
        """
        Test a standard exception handled by default by the rest framework
        """
        exp = ValidationError('validation error')
        resp = custom_exception_handler(exp, self.context)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.data == ['validation error']

    def test_improperly_configured(self):
        """
        Test a standard exception not handled by default by the rest framework
        """
        exp = ImproperlyConfigured('improperly configured')
        resp = custom_exception_handler(exp, self.context)
        assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert resp.data == ['ImproperlyConfigured: improperly configured']

    def test_index_error(self):
        """
        Test a other kind of exceptions are not handled
        """
        exp = IndexError('index error')
        resp = custom_exception_handler(exp, self.context)
        assert resp is None


def format_as_iso8601(time):
    """Helper function to format datetime with the Z at the end"""
    # Can't use datetime.isoformat() because format is slightly different from this
    iso_format = '%Y-%m-%dT%H:%M:%S.%f'
    # chop off microseconds to make milliseconds
    return time.strftime(iso_format)[:-3] + "Z"


# pylint: disable=no-self-use
class SerializerTests(TestCase):
    """
    Tests for serialize_model
    """
    def test_jsonfield(self):
        """
        Test a model with a JSONField is handled correctly
        """
        with override_settings(CYBERSOURCE_SECURITY_KEY='asdf'):
            receipt = ReceiptFactory.create()
            assert serialize_model_object(receipt) == {
                'created_at': format_as_iso8601(receipt.created_at),
                'data': receipt.data,
                'id': receipt.id,
                'modified_at': format_as_iso8601(receipt.modified_at),
                'order': receipt.order.id,
            }

    def test_datetime(self):
        """
        Test that a model with a datetime and date field is handled correctly
        """
        financial_aid = FinancialAidFactory.create(justification=None)
        assert serialize_model_object(financial_aid) == {
            'country_of_income': financial_aid.country_of_income,
            'country_of_residence': financial_aid.country_of_residence,
            'created_on': format_as_iso8601(financial_aid.created_on),
            'date_documents_sent': financial_aid.date_documents_sent.isoformat(),
            'date_exchange_rate': format_as_iso8601(financial_aid.date_exchange_rate),
            'id': financial_aid.id,
            'income_usd': financial_aid.income_usd,
            'justification': None,
            'original_currency': financial_aid.original_currency,
            'original_income': financial_aid.original_income,
            'status': financial_aid.status,
            'tier_program': financial_aid.tier_program.id,
            'updated_on': format_as_iso8601(financial_aid.updated_on),
            'user': financial_aid.user.id,
        }

    def test_decimal(self):
        """
        Test that a model with a decimal field is handled correctly
        """
        course_price = CoursePriceFactory.create()
        assert serialize_model_object(course_price) == {
            'course_run': course_price.course_run.id,
            'created_at': format_as_iso8601(course_price.created_at),
            'id': course_price.id,
            'is_valid': course_price.is_valid,
            'modified_at': format_as_iso8601(course_price.modified_at),
            'price': str(course_price.price),
        }


class FieldNamesTests(unittest.TestCase):
    """
    Tests for get_field_names
    """

    def test_get_field_names(self):
        """
        Assert that get_field_names does not include related fields
        """
        assert set(get_field_names(Order)) == {
            'user',
            'status',
            'total_price_paid',
            'created_at',
            'modified_at',
        }
