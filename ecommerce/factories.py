"""
Factories for ecommerce models
"""
from factory import (
    LazyAttribute,
    SelfAttribute,
    SubFactory,
    Trait,
)
from factory.django import DjangoModelFactory
from factory.fuzzy import (
    FuzzyChoice,
    FuzzyDecimal,
    FuzzyText,
)
import faker

from courses.factories import (
    CourseRunFactory,
    CourseFactory,
    ProgramFactory,
)
from ecommerce.api import (
    make_reference_id,
    generate_cybersource_sa_signature,
)
from ecommerce.models import (
    Coupon,
    Line,
    Order,
    Receipt,
)
from micromasters.factories import UserFactory


FAKE = faker.Factory.create()


class OrderFactory(DjangoModelFactory):
    """Factory for Order"""
    user = SubFactory(UserFactory)
    status = FuzzyChoice(
        Order.STATUSES
    )
    total_price_paid = FuzzyDecimal(low=0, high=12345)

    class Meta:
        model = Order

    class Params:
        fulfilled = Trait(
            status=Order.FULFILLED
        )


class LineFactory(DjangoModelFactory):
    """Factory for Line"""
    order = SubFactory(OrderFactory)
    price = SelfAttribute('order.total_price_paid')
    description = FuzzyText(prefix="Line ")
    course_key = FuzzyText()

    class Meta:
        model = Line


def gen_fake_receipt_data(order=None):
    """
    Helper function to generate a fake signed piece of data
    """
    data = {}
    for _ in range(10):
        data[FAKE.text()] = FAKE.text()
    keys = sorted(data.keys())
    data['signed_field_names'] = ",".join(keys)
    data['unsigned_field_names'] = ''
    data['req_reference_number'] = make_reference_id(order) if order else ''
    data['signature'] = generate_cybersource_sa_signature(data)
    return data


class ReceiptFactory(DjangoModelFactory):
    """Factory for Receipt"""
    order = SubFactory(OrderFactory)
    data = LazyAttribute(lambda receipt: gen_fake_receipt_data(receipt.order))

    class Meta:
        model = Receipt


class CouponFactory(DjangoModelFactory):
    """Factory for Coupon"""
    coupon_code = FuzzyText()
    coupon_type = Coupon.STANDARD
    amount_type = Coupon.PERCENT_DISCOUNT
    amount = FuzzyDecimal(0, 1)

    class Meta:
        model = Coupon

    content_object = SubFactory(ProgramFactory, financial_aid_availability=True)

    class Params:  # pylint: disable=missing-docstring
        percent = Trait(
            amount_type='percent-discount',
            amount=FuzzyDecimal(0, 1),
        )
        fixed = Trait(
            amount_type='fixed-discount',
            amount=FuzzyDecimal(50, 1000),
        )
        program = Trait(
            content_object=SubFactory(ProgramFactory)
        )
        course = Trait(
            content_object=SubFactory(CourseFactory)
        )
        course_run = Trait(
            content_object=SubFactory(CourseRunFactory)
        )
