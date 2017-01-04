"""Serializers for ecommerce REST APIs"""

from rest_framework import serializers

from ecommerce.models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for Coupon"""
    class Meta:  # pylint: disable=missing-docstring
        model = Coupon
        fields = ('coupon_code', 'content_type', 'amount_type', 'amount',)
