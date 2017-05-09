"""
Tests for ecommerce serializers
"""
from django.core.exceptions import ValidationError
from django.test import TestCase

from courses.factories import CourseRunFactory
from ecommerce.factories import CouponFactory
from ecommerce.models import Coupon
from ecommerce.serializers import CouponSerializer


class SerializerTests(TestCase):
    """Tests for ecommerce serializers"""

    def test_coupon_program(self):
        """
        Test coupon serializer
        """
        coupon = CouponFactory.create(content_object=CourseRunFactory.create().course.program)
        assert CouponSerializer(coupon).data == {
            'amount': str(coupon.amount),
            'amount_type': coupon.amount_type,
            'content_type': 'program',
            'coupon_type': Coupon.STANDARD,
            'coupon_code': coupon.coupon_code,
            'program_id': coupon.program.id,
            'object_id': coupon.object_id,
        }

    def test_coupon_course(self):
        """
        Test coupon serializer
        """
        coupon = CouponFactory.create(content_object=CourseRunFactory.create().course)
        assert CouponSerializer(coupon).data == {
            'amount': str(coupon.amount),
            'amount_type': coupon.amount_type,
            'content_type': 'course',
            'coupon_type': Coupon.STANDARD,
            'coupon_code': coupon.coupon_code,
            'program_id': coupon.program.id,
            'object_id': coupon.object_id,
        }

    def test_coupon_run(self):
        """
        Test coupon serializer
        """
        with self.assertRaises(ValidationError) as ex:
            CouponFactory.create(content_object=CourseRunFactory.create())
        assert ex.exception.args[0]['__all__'][0].args[0] == 'content_object must be of type Course or Program'
