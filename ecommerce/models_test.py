"""
Tests for ecommerce models
"""

from django.test import (
    TestCase,
    override_settings,
)

from ecommerce.exceptions import EcommerceModelException
from ecommerce.factories import (
    CoursePriceFactory,
    LineFactory,
    OrderFactory,
    ReceiptFactory,
)
from micromasters.utils import serialize_model_object


# pylint: disable=no-self-use
@override_settings(CYBERSOURCE_SECURITY_KEY='fake')
class OrderTests(TestCase):
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


class CoursePriceTests(TestCase):
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

    def test_update_one_is_valid(self):
        """
        If only one CoursePrice has is_valid=True, we should be able to update it without problems
        """
        price = CoursePriceFactory.create(is_valid=True)
        price.price = 345
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
