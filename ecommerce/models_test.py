"""
Tests for ecommerce models
"""
from datetime import (
    datetime,
    timedelta,
)
from unittest.mock import patch

import ddt
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import (
    ImproperlyConfigured,
    ValidationError,
)
from django.test import (
    override_settings,
)
import pytz

from courses.factories import CourseRunFactory
from ecommerce.exceptions import EcommerceModelException
from ecommerce.factories import (
    CouponFactory,
    CoursePriceFactory,
    LineFactory,
    OrderFactory,
    ReceiptFactory,
)
from ecommerce.models import (
    Coupon,
    CouponInvoice,
    Order,
    RedeemedCoupon,
)
from micromasters.utils import serialize_model_object
from profiles.factories import UserFactory
from profiles.models import Profile
from search.base import MockedESTestCase


@override_settings(CYBERSOURCE_SECURITY_KEY='fake')
class OrderTests(MockedESTestCase):
    """
    Tests for Order, Line, and Receipt
    """

    def test_order_str(self):
        """Test Order.__str__"""
        order = LineFactory.create().order
        assert str(order) == "Order {}, status={} for user={}".format(order.id, order.status, order.user)

    def test_line_str(self):
        """Test Line.__str__"""
        line = LineFactory.create()
        assert str(line) == "Line for order {}, course_key={}, price={}".format(
            line.order.id,
            line.course_key,
            line.price,
        )

    def test_receipt_str_with_order(self):
        """Test Receipt.__str__ with an order"""
        receipt = ReceiptFactory.create()
        assert str(receipt) == "Receipt for order {}".format(receipt.order.id if receipt.order else None)

    def test_receipt_str_no_order(self):
        """Test Receipt.__str__ with no order"""
        receipt = ReceiptFactory.create(order=None)
        assert str(receipt) == "Receipt with no attached order"

    def test_to_dict(self):
        """
        Test Order.to_dict()
        """
        order = OrderFactory.create()
        lines = [LineFactory.create(order=order) for _ in range(5)]
        data = order.to_dict()
        lines_data = data.pop('lines')
        assert serialize_model_object(order) == data
        assert lines_data == [serialize_model_object(line) for line in lines]


class CoursePriceTests(MockedESTestCase):
    """
    Tests for CoursePrice
    """

    def test_create_no_two_is_valid(self):
        """
        Two is_valid CoursePrice instances on the same model are not valid
        """
        price = CoursePriceFactory.create(is_valid=True)
        with self.assertRaises(EcommerceModelException) as ex:
            CoursePriceFactory.create(is_valid=True, course_run=price.course_run)

        assert ex.exception.args[0] == "Cannot have two CoursePrice objects for same CourseRun marked is_valid"

    def test_update_no_two_is_valid(self):
        """
        A CoursePrice instance shouldn't be able to be updated to have two is_valid instances for a CourseRun
        """
        price = CoursePriceFactory.create(is_valid=False)
        CoursePriceFactory.create(is_valid=True, course_run=price.course_run)
        with self.assertRaises(EcommerceModelException) as ex:
            price.is_valid = True
            price.save()

        assert ex.exception.args[0] == "Cannot have two CoursePrice objects for same CourseRun marked is_valid"

    def test_clean_no_two_is_valid(self):
        """
        A CoursePrice instance should raise a ValidationError if another CoursePrice for the same CourseRun
        is already marked is_valid
        """
        price = CoursePriceFactory.create(is_valid=False)
        CoursePriceFactory.create(is_valid=True, course_run=price.course_run)
        with self.assertRaises(ValidationError) as ex:
            price.is_valid = True
            price.clean()

        assert ex.exception.args[0] == {
            'is_valid': "Cannot have two CoursePrice objects for same CourseRun marked is_valid",
        }

    def test_update_one_is_valid(self):
        """
        If only one CoursePrice has is_valid=True, we should be able to update it without problems
        """
        price = CoursePriceFactory.create(is_valid=True)
        price.price = 345
        price.clean()
        price.save()

    def test_two_different_courseruns(self):
        """
        Two CoursePrices can have is_valid=True for two different CourseRuns
        """
        CoursePriceFactory.create(is_valid=True)
        CoursePriceFactory.create(is_valid=True)

    def test_str(self):
        """
        Test output of __str__
        """
        course_price = CoursePriceFactory.create()
        assert str(course_price) == "CoursePrice for {}, price={}, is_valid={}".format(
            course_price.course_run, course_price.price, course_price.is_valid
        )


@ddt.ddt
class CouponTests(MockedESTestCase):
    """Tests for Coupon"""

    def test_validate_content_object(self):
        """
        Coupon.content_object should only accept Course, CourseRun, or Program
        """
        course_run = CourseRunFactory.create()
        user = UserFactory.create()
        coupons = []
        for obj in (course_run, course_run.course, course_run.course.program):
            coupons.append(CouponFactory.create(content_object=obj))

        with self.assertRaises(ValidationError) as ex:
            CouponFactory.create(content_object=user)
        assert ex.exception.args[0]['__all__'][0].args[0] == (
            'content_object must be of type Course, CourseRun, or Program'
        )

    def test_validate_amount(self):
        """
        Coupon.amount should be between 0 and 1 if amount_type is percent-discount
        """
        with self.assertRaises(ValidationError) as ex:
            CouponFactory.create(amount=3, amount_type=Coupon.PERCENT_DISCOUNT)
        assert ex.exception.args[0]['__all__'][0].args[0] == (
            'amount must be between 0 and 1 if amount_type is percent-discount'
        )

    def test_validate_amount_type(self):
        """
        Coupon.amount_type should be one of Coupon.AMOUNT_TYPES
        """
        with self.assertRaises(ValidationError) as ex:
            CouponFactory.create(amount_type='xyz')
        assert ex.exception.args[0]['__all__'][0].args[0] == (
            'amount_type must be one of percent-discount, fixed-discount, fixed-price'
        )

    def test_validate_coupon_type(self):
        """Coupon.coupon_type must be one of Coupon.COUPON_TYPES"""
        with self.assertRaises(ValidationError) as ex:
            CouponFactory.create(coupon_type='xyz')
        assert ex.exception.args[0]['__all__'][0].args[0] == (
            'coupon_type must be one of {}'.format(", ".join(Coupon.COUPON_TYPES))
        )

    def test_validate_discount_prev_run_coupon_type(self):
        """Coupon must be for a course if Coupon.coupon_type is DISCOUNTED_PREVIOUS_RUN"""
        run = CourseRunFactory.create()
        for obj in [run, run.course.program]:
            with self.assertRaises(ValidationError) as ex:
                CouponFactory.create(coupon_type=Coupon.DISCOUNTED_PREVIOUS_COURSE, content_object=obj)
            assert ex.exception.args[0]['__all__'][0].args[0] == (
                'coupon must be for a course if coupon_type is discounted-previous-course'
            )

    def test_course_keys(self):
        """
        Coupon.course_keys should return a list of all course run keys in a program, course, or course run
        """
        run1 = CourseRunFactory.create()
        run2 = CourseRunFactory.create(course=run1.course)
        run3 = CourseRunFactory.create(course__program=run1.course.program)
        run4 = CourseRunFactory.create(course=run3.course)

        coupon_program = CouponFactory.create(
            content_object=run1.course.program,
        )
        assert sorted(coupon_program.course_keys) == sorted([run.edx_course_key for run in [run1, run2, run3, run4]])

        coupon_course = CouponFactory.create(content_object=run1.course)
        assert sorted(coupon_course.course_keys) == sorted([run.edx_course_key for run in [run1, run2]])

        coupon_run = CouponFactory.create(content_object=run1)
        assert coupon_run.course_keys == [run1.edx_course_key]

    def test_program(self):
        """
        Coupon.course_keys should return a list of all course run keys in a program, course, or course run
        """
        run1 = CourseRunFactory.create()
        CourseRunFactory.create(course=run1.course)
        run3 = CourseRunFactory.create(course__program=run1.course.program)
        CourseRunFactory.create(course=run3.course)

        coupon_program = CouponFactory.create(
            content_object=run1.course.program,
        )
        assert coupon_program.program == run1.course.program

        coupon_course = CouponFactory.create(content_object=run1.course)
        assert coupon_course.program == run1.course.program

        coupon_run = CouponFactory.create(content_object=run1)
        assert coupon_run.program == run1.course.program

    def test_course_keys_invalid_content_object(self):
        """
        course_keys should error if we set content_object to an invalid value
        """
        coupon = CouponFactory.create()
        profile_content_type = ContentType.objects.get_for_model(Profile)
        # bypass clean()
        Coupon.objects.filter(id=coupon.id).update(content_type=profile_content_type)
        coupon.refresh_from_db()
        with self.assertRaises(ImproperlyConfigured) as ex:
            _ = coupon.course_keys
        assert ex.exception.args[0] == "content_object expected to be one of Program, Course, CourseRun"

    def test_program_invalid_content_object(self):
        """
        program should error if we set content_object to an invalid value
        """
        coupon = CouponFactory.create()
        profile_content_type = ContentType.objects.get_for_model(Profile)
        # bypass clean()
        Coupon.objects.filter(id=coupon.id).update(content_type=profile_content_type)
        coupon.refresh_from_db()
        with self.assertRaises(ImproperlyConfigured) as ex:
            _ = coupon.program
        assert ex.exception.args[0] == "content_object expected to be one of Program, Course, CourseRun"

    def test_is_valid(self):
        """
        Coupon.is_valid should return True if the coupon is enabled and within the valid date range
        """
        now = datetime.now(tz=pytz.UTC)
        assert CouponFactory.create(enabled=True).is_valid is True
        assert CouponFactory.create(enabled=False).is_valid is False
        assert CouponFactory.create(activation_date=now - timedelta(days=1)).is_valid is True
        assert CouponFactory.create(activation_date=now + timedelta(days=1)).is_valid is False
        assert CouponFactory.create(expiration_date=now - timedelta(days=1)).is_valid is False
        assert CouponFactory.create(expiration_date=now + timedelta(days=1)).is_valid is True

    def test_is_automatic(self):
        """
        Coupon.is_automatic_qset should be true if the coupon type is DISCOUNTED_PREVIOUS_COURSE
        """
        coupon_not_automatic = CouponFactory.create(coupon_type=Coupon.STANDARD)
        assert Coupon.is_automatic_qset().filter(id=coupon_not_automatic.id).exists() is False
        run = CourseRunFactory.create()
        coupon_is_automatic = CouponFactory.create(
            coupon_type=Coupon.DISCOUNTED_PREVIOUS_COURSE,
            content_object=run.course,
        )
        assert Coupon.is_automatic_qset().filter(id=coupon_is_automatic.id).exists() is True

    @ddt.data(
        [Order.CREATED, True, True, False],
        [Order.CREATED, False, True, False],
        [Order.FULFILLED, True, True, False],
        [Order.FULFILLED, False, True, False],
        [Order.CREATED, True, False, True],
        [Order.CREATED, False, False, True],
        [Order.FULFILLED, True, False, True],
        [Order.FULFILLED, False, False, False],
    )
    @ddt.unpack
    def test_user_has_redemptions_left(self, order_status, has_unpurchased_run, another_already_redeemed, expected):
        """
        Coupon.user_has_redemptions_left should be true if user has not yet purchased all course runs
        """
        run1 = CourseRunFactory.create()
        if has_unpurchased_run:
            CourseRunFactory.create(course__program=run1.course.program)

        line = LineFactory.create(course_key=run1.edx_course_key, order__status=order_status)
        coupon = CouponFactory.create(content_object=run1.course.program)
        with patch(
            'ecommerce.models.Coupon.another_user_already_redeemed',
            autospec=True,
        ) as _already_redeemed:
            _already_redeemed.return_value = another_already_redeemed
            assert coupon.user_has_redemptions_left(line.order.user) is expected
        _already_redeemed.assert_called_with(coupon, line.order.user)

    @ddt.data(
        [Order.CREATED, True, False],
        [Order.CREATED, False, False],
        [Order.FULFILLED, True, True],
        [Order.FULFILLED, False, False],
    )
    @ddt.unpack
    def test_another_user_already_redeemed(self, order_status, other_user_redeemed, expected):
        """
        Tests for Coupon.another_user_already_redeemed
        """
        run1 = CourseRunFactory.create()
        run2 = CourseRunFactory.create(course__program=run1.course.program)
        coupon = CouponFactory.create(content_object=run1.course.program)

        line1 = LineFactory.create(course_key=run1.edx_course_key, order__status=Order.FULFILLED)
        RedeemedCoupon.objects.create(order=line1.order, coupon=coupon)

        if other_user_redeemed:
            line2 = LineFactory.create(course_key=run2.edx_course_key, order__status=order_status)
            RedeemedCoupon.objects.create(order=line2.order, coupon=coupon)

        assert coupon.another_user_already_redeemed(line1.order.user) is expected

    def test_invoice_str(self):
        """
        Test str(CouponInvoice)
        """
        invoice = CouponInvoice.objects.create(invoice_number="number #1", description="an invoice")
        assert str(invoice) == "CouponInvoice for invoice number #1: an invoice"
