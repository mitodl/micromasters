"""
Tests for ecommerce serializers
"""
from django.test import TestCase

from courses.factories import CourseRunFactory
from ecommerce.factories import CouponFactory
from ecommerce.serializers import CouponSerializer


# pylint: disable=no-self-use
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
            'coupon_code': coupon.coupon_code,
            'program_id': coupon.program.id,
            'object_id': coupon.object_id,
        }

    def test_coupon_run(self):
        """
        Test coupon serializer
        """
        coupon = CouponFactory.create(content_object=CourseRunFactory.create())
        assert CouponSerializer(coupon).data == {
            'amount': str(coupon.amount),
            'amount_type': coupon.amount_type,
            'content_type': 'courserun',
            'coupon_code': coupon.coupon_code,
            'program_id': coupon.program.id,
            'object_id': coupon.object_id,
        }
