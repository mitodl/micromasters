"""
Tests for cms/util.py
"""
from django.http.request import HttpRequest

from cms.util import get_coupon_code
from micromasters.test import SimpleTestCase


class UtilTestCase(SimpleTestCase):
    """
    Tests for get_coupon_code()
    """
    def setUp(self):
        super().setUp()
        self.request = HttpRequest()

    def test_coupon_in_next_url(self):
        """
        Test if the coupon is in the query string of the `next` url
        """
        self.request.GET["next"] = "/dashboard?coupon=abc"
        coupon = get_coupon_code(self.request)
        assert coupon == "abc"

    def test_coupon_in_wrong_next_url(self):
        """
        We should ignore a coupon code that's not for the dashboard
        """
        self.request.GET["next"] = "/profile?coupon=abc"
        coupon = get_coupon_code(self.request)
        assert coupon is None

    def test_no_coupon(self):
        """
        Test without a query string
        """
        coupon = get_coupon_code(self.request)
        assert coupon is None

    def test_no_coupon_in_next(self):
        """
        Test with a `next` url that doesn't have a coupon
        """
        self.request.GET["next"] = "/dashboard"
        coupon = get_coupon_code(self.request)
        assert coupon is None
