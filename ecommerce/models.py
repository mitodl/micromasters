"""
Models for storing ecommerce data
"""

from django.db.models import Model
from django.db.models.fields import (
    CharField,
    DateTimeField,
    DecimalField,
    TextField,
)
from django.db.models.fields.related import (
    ForeignKey,
)


class Order(Model):
    """
    An order made
    """
    FULFILLED = 'fulfilled'
    CREATED = 'created'

    STATUSES = [CREATED, FULFILLED]

    status = CharField(
        choices=[(status, status) for status in STATUSES],
        default=CREATED,
        max_length=30,
    )

    created_at = DateTimeField(auto_now_add=True)
    modified_at = DateTimeField(auto_now=True)
    total_price_paid = DecimalField(decimal_places=2, max_digits=20)


class Line(Model):
    """
    A line in an order
    """
    course_key = TextField()
    order = ForeignKey(Order)
    price = DecimalField(decimal_places=2, max_digits=20)
    description = TextField(blank=True, null=True)

    created_at = DateTimeField(auto_now_add=True)
    modified_at = DateTimeField(auto_now=True)
