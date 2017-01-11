"""
Models for storing ecommerce data
"""
from datetime import datetime

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import JSONField
from django.core.exceptions import (
    ImproperlyConfigured,
    ValidationError,
)
from django.db import transaction
from django.db.models import (
    Model,
    SET_NULL,
)
from django.db.models.fields import (
    BooleanField,
    CharField,
    DateTimeField,
    DecimalField,
    PositiveIntegerField,
    TextField,
)
from django.db.models.fields.related import (
    ForeignKey,
)
import pytz

from courses.models import (
    Course,
    CourseRun,
    Program,
)
from ecommerce.exceptions import EcommerceModelException
from micromasters.models import (
    AuditableModel,
    AuditModel,
)
from micromasters.utils import serialize_model_object


class Order(AuditableModel):
    """
    An order for financial aid programs
    """
    FULFILLED = 'fulfilled'
    FAILED = 'failed'
    CREATED = 'created'
    REFUNDED = 'refunded'

    STATUSES = [CREATED, FULFILLED, FAILED, REFUNDED]

    user = ForeignKey(User)
    status = CharField(
        choices=[(status, status) for status in STATUSES],
        default=CREATED,
        max_length=30,
        db_index=True,
    )

    created_at = DateTimeField(auto_now_add=True)
    modified_at = DateTimeField(auto_now=True)
    total_price_paid = DecimalField(decimal_places=2, max_digits=20)

    def __str__(self):
        """Description for Order"""
        return "Order {}, status={} for user={}".format(self.id, self.status, self.user)

    @classmethod
    def get_audit_class(cls):
        return OrderAudit

    def to_dict(self):
        """
        Get a serialized representation of the Order and any attached Lines
        """
        data = serialize_model_object(self)
        data['lines'] = [serialize_model_object(line) for line in self.line_set.all()]
        return data


class OrderAudit(AuditModel):
    """
    Audit model for Order
    """
    order = ForeignKey(Order, null=True, on_delete=SET_NULL)

    @classmethod
    def get_related_field_name(cls):
        return 'order'


class Line(Model):
    """
    A line in an order. This contains information about a specific item to be purchased.
    """
    course_key = TextField(db_index=True)
    order = ForeignKey(Order)
    price = DecimalField(decimal_places=2, max_digits=20)
    description = TextField(blank=True, null=True)

    created_at = DateTimeField(auto_now_add=True)
    modified_at = DateTimeField(auto_now=True)

    def __str__(self):
        """Description for Line"""
        return "Line for order {}, course_key={}, price={}".format(self.order.id, self.course_key, self.price)


class Receipt(Model):
    """
    The contents of the message from CyberSource about an Order fulfillment or cancellation
    """
    order = ForeignKey(Order, null=True)
    data = JSONField()

    created_at = DateTimeField(auto_now_add=True)
    modified_at = DateTimeField(auto_now=True)

    def __str__(self):
        """Description of Receipt"""
        if self.order:
            return "Receipt for order {}".format(self.order.id)
        else:
            return "Receipt with no attached order"


class CoursePrice(Model):
    """
    Information about a course run's price and other ecommerce info
    """
    course_run = ForeignKey(CourseRun)
    price = DecimalField(decimal_places=2, max_digits=20)
    is_valid = BooleanField(default=False)

    created_at = DateTimeField(auto_now_add=True)
    modified_at = DateTimeField(auto_now=True)

    def clean(self):
        """
        Override clean to provide user-friendly validation around CoursePrice.is_valid
        """
        if self.is_valid and CoursePrice.objects.filter(
                course_run=self.course_run,
                is_valid=True
        ).exclude(id=self.id).exists():
            raise ValidationError({
                'is_valid': 'Cannot have two CoursePrice objects for same CourseRun marked is_valid',
            })

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

    def __str__(self):
        """Description for CoursePrice"""
        return "CoursePrice for {}, price={}, is_valid={}".format(self.course_run, self.price, self.is_valid)


class Coupon(Model):
    """
    Model for a coupon. This stores the discount for the coupon and other information about how it should be redeemed.

    When a coupon is redeemed by a purchaser the counter on this object is decremented
    and a UserCoupon object is created for that particular purchaser.
    """
    PERCENT_DISCOUNT = 'percent-discount'
    FIXED_DISCOUNT = 'fixed-discount'

    AMOUNT_TYPES = [PERCENT_DISCOUNT, FIXED_DISCOUNT]

    STANDARD = 'standard'
    DISCOUNTED_PREVIOUS_COURSE = 'discounted-previous-course'
    COUPON_TYPES = [STANDARD, DISCOUNTED_PREVIOUS_COURSE]

    coupon_code = TextField(
        null=True,
        blank=True,
        help_text="""The coupon code used for redemption by the purchaser in the user interface.
    If blank, the purchaser may not redeem this coupon through the user interface,
    though it may be redeemed in their name by an administrator.""",
    )
    content_type = ForeignKey(
        ContentType,
        on_delete=SET_NULL,
        null=True,
        help_text="content_object is a link to either a Course, CourseRun, or a Program",
    )
    object_id = PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    # Meaning of content_object depends on coupon_type
    coupon_type = CharField(
        choices=[(_type, _type) for _type in COUPON_TYPES],
        max_length=30,
        help_text="The type of the coupon which describes what circumstances the coupon can be redeemed",
    )

    amount_type = CharField(
        choices=[(_type, _type) for _type in AMOUNT_TYPES],
        max_length=30,
        help_text="Whether amount is a percent or fixed discount",
    )
    amount = DecimalField(
        decimal_places=2,
        max_digits=20,
        help_text="Either a number from 0 to 1 representing a percent, or the fixed value for discount",
    )

    expiration_date = DateTimeField(
        null=True,
        blank=True,
        help_text="If set, the coupons will not be redeemable after this time",
    )
    activation_date = DateTimeField(
        null=True,
        blank=True,
        help_text="If set, the coupons will not be redeemable before this time",
    )
    enabled = BooleanField(default=True, help_text="If true, coupons are presently redeemable")

    @property
    def course_keys(self):
        """Get the course keys which the coupon can be redeemed with"""
        obj = self.content_object
        if isinstance(obj, Program):
            return CourseRun.objects.filter(course__program=obj).values_list('edx_course_key', flat=True)
        elif isinstance(obj, Course):
            return CourseRun.objects.filter(course=obj).values_list('edx_course_key', flat=True)
        elif isinstance(obj, CourseRun):
            return [obj.edx_course_key]
        else:
            # Should probably not get here, clean() should take care of validating this
            raise ImproperlyConfigured("content_object expected to be one of Program, Course, CourseRun")

    @property
    def is_valid(self):
        """Returns true if the coupon is enabled and also within the valid date range"""
        now = datetime.now(tz=pytz.UTC)
        if not self.enabled:
            return False
        if self.activation_date is not None and now <= self.activation_date:
            return False
        if self.expiration_date is not None and now >= self.expiration_date:
            return False
        return True

    @property
    def is_automatic(self):
        """
        Returns true if the coupon would be redeemed automatically without input from the user.
        """
        return self.coupon_type == self.DISCOUNTED_PREVIOUS_COURSE

    def user_has_redemptions_left(self, user):
        """
        Has the coupon not already been redeemed by another user, and has the user not already
        redeemed the coupon for all possible runs?

        Args:
            user (django.contrib.auth.models.User): A user

        Returns:
            bool:
                True if user has not redeemed the coupon for all valid runs already
        """
        if self.another_user_already_redeemed(user):
            return False

        runs_purchased = set(Line.objects.filter(
            order__user=user,
            order__status=Order.FULFILLED,
        ).values_list("course_key", flat=True))
        return not set(self.course_keys).issubset(runs_purchased)

    def another_user_already_redeemed(self, user):
        """
        Has another user already redeemed the coupon for something? However if the coupon is automatic
        then it is allowed to be redeemed by any number of users.

        Args:
            user (django.contrib.auth.models.User): A user

        Returns:
            bool:
                True if the coupon is not automatic and it has already been redeemed by someone else
        """
        return not self.is_automatic and RedeemedCoupon.objects.filter(
            coupon=self,
            order__status=Order.FULFILLED,
        ).exclude(order__user=user).exists()

    def clean(self):
        """Validate amount and content_object"""
        super().clean()

        if self.content_type.model_class() not in (
                Course,
                CourseRun,
                Program,
        ):
            raise ValidationError("content_object must be of type Course, CourseRun, or Program")

        if self.amount_type == self.PERCENT_DISCOUNT:
            if self.amount is None or not 0 <= self.amount <= 1:
                raise ValidationError("amount must be between 0 and 1 if amount_type is {}".format(
                    self.PERCENT_DISCOUNT
                ))

        if self.amount_type not in self.AMOUNT_TYPES:
            raise ValidationError("amount_type must be one of {}".format(", ".join(self.AMOUNT_TYPES)))

        if self.coupon_type not in self.COUPON_TYPES:
            raise ValidationError("coupon_type must be one of {}".format(", ".join(self.COUPON_TYPES)))

        if self.coupon_type == self.DISCOUNTED_PREVIOUS_COURSE and not isinstance(self.content_object, Course):
            raise ValidationError(
                "coupon must be for a course if coupon_type is {}".format(self.DISCOUNTED_PREVIOUS_COURSE)
            )

    def save(self, *args, **kwargs):
        """Override save to do certain validations"""
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        """Description for Coupon"""
        return "Coupon {amount_type} {amount} of type {coupon_type} for {product}".format(
            amount_type=self.amount_type,
            amount=self.amount,
            product=self.content_object,
            coupon_type=self.coupon_type,
        )


class UserCoupon(Model):
    """
    Model for a coupon attached to a user.
    """
    user = ForeignKey(settings.AUTH_USER_MODEL, on_delete=SET_NULL, null=True)
    coupon = ForeignKey(Coupon, on_delete=SET_NULL, null=True)

    class Meta:
        unique_together = ('user', 'coupon',)

    def __str__(self):
        """Description for UserCoupon"""
        return "UserCoupon for {user}, {coupon}".format(
            user=self.user,
            coupon=self.coupon,
        )


class RedeemedCoupon(Model):
    """
    Model for coupon which has been used in a purchase by a user.
    """
    order = ForeignKey(Order, on_delete=SET_NULL, null=True)
    coupon = ForeignKey(Coupon, on_delete=SET_NULL, null=True)

    class Meta:
        unique_together = ('order', 'coupon',)

    def __str__(self):
        """Description for RedeemedCoupon"""
        return "RedeemedCoupon for {order}, {coupon}".format(
            order=self.order,
            coupon=self.coupon,
        )
