"""
Tests for the utils module
"""

from django.core.exceptions import ImproperlyConfigured
from django.template import RequestContext
from django.test import RequestFactory, TestCase
from rest_framework import status
from rest_framework.exceptions import ValidationError

from micromasters.utils import custom_exception_handler


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
