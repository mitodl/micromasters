"""
Models for storing ecommerce data
"""
from django.db import transaction
from django.db.models import Model
from django.db.models.fields import (
    BooleanField,
    CharField,
    DateTimeField,
    DecimalField,
    TextField,
)
from django.db.models.fields.related import (
    ForeignKey,
)

from courses.models import CourseRun
from ecommerce.exceptions import EcommerceModelException


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


class CoursePrice(Model):
    """
    Information about a course run's price and other ecommerce info
    """
    course_run = ForeignKey(CourseRun)
    price = DecimalField(decimal_places=2, max_digits=20)
    is_valid = BooleanField(default=False)

    created_at = DateTimeField(auto_now_add=True)
    modified_at = DateTimeField(auto_now=True)

    @transaction.atomic
    def save(self, *args, **kwargs):
        """
        Override save to make sure is_valid is only set per one CourseRun
        """
        if self.is_valid and CoursePrice.objects.filter(
                course_run=self.course_run,
                is_valid=True
        ).exclude(id=self.id).exists():
            raise EcommerceModelException("Cannot have two CoursePrice objects for same CourseRun marked is_valid")

        super(CoursePrice, self).save(*args, **kwargs)
