"""Serializers for ecommerce REST APIs"""

from rest_framework import serializers

from ecommerce.models import Coupon


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for Coupon"""
    program_id = serializers.SerializerMethodField()
    content_type = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = ('coupon_code', 'coupon_type', 'content_type', 'amount_type', 'amount', 'program_id', 'object_id',)

    def get_program_id(self, coupon):
        """Get program id from coupon program"""
        return coupon.program.id

    def get_content_type(self, coupon):
        """Get the content type as a string"""
        return coupon.content_type.model
