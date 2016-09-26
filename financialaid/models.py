"""
Models for the Financial Aid App
"""
import datetime
from django.contrib.auth.models import User
from django.db import (
    models,
    transaction,
)
from jsonfield import JSONField

from courses.models import (
    Program,
)


class TimestampedModelQuerySet(models.query.QuerySet):
    """
    Subclassed QuerySet for TimestampedModelManager
    """
    def update(self, **kwargs):
        """
        Automatically update updated_on timestamp when .update(). This is because .update()
        does not go through .save(), thus will not auto_now, because it happens on the
        database level without loading objects into memory.
        """
        if "updated_on" not in kwargs:
            kwargs["updated_on"] = datetime.datetime.utcnow()
        return super().update(**kwargs)


class TimestampedModelManager(models.Manager):
    """
    Subclassed manager for TimestampedModel
    """
    def update(self, **kwargs):
        """
        Allows access to TimestampedModelQuerySet's update method on the manager
        """
        return self.get_queryset().update(**kwargs)

    def get_queryset(self):
        """
        Returns custom queryset
        """
        return TimestampedModelQuerySet(self.model, using=self._db)


class TimestampedModel(models.Model):
    """
    Base model for create/update timestamps
    """
    objects = TimestampedModelManager()
    created_on = models.DateTimeField(auto_now_add=True)  # UTC
    updated_on = models.DateTimeField(auto_now=True)  # UTC

    class Meta:
        abstract = True


class Tier(TimestampedModel):
    """
    The possible tiers to be used
    """
    name = models.TextField()
    description = models.TextField()


class TierProgram(TimestampedModel):
    """
    The tiers for discounted pricing assigned to a program
    """
    program = models.ForeignKey(Program, null=False, related_name="tier_programs")
    tier = models.ForeignKey(Tier, null=False)
    discount_amount = models.IntegerField(null=False)
    current = models.BooleanField(null=False, default=False)
    income_threshold = models.IntegerField(null=False)

    class Meta:
        unique_together = ('program', 'tier')

    @transaction.atomic
    def save(self, *args, **kwargs):
        """
        Override the save to enforce the existence of only one `current` = True
        per program and tier
        """
        if self.current:
            TierProgram.objects.filter(program=self.program, tier=self.tier, current=True).update(current=False)
        return super(TierProgram, self).save(*args, **kwargs)


class FinancialAidStatus:
    """Statuses for the Financial Aid model"""
    CREATED = 'created'
    AUTO_APPROVED = 'auto-approved'
    PENDING_DOCS = 'pending-docs'
    PENDING_MANUAL_APPROVAL = 'pending-manual-approval'
    APPROVED = 'approved'
    REJECTED = 'rejected'

    ALL_STATUSES = [CREATED, APPROVED, AUTO_APPROVED, REJECTED, PENDING_DOCS, PENDING_MANUAL_APPROVAL]
    STATUS_MESSAGES_DICT = {
        CREATED: "Created Applications",
        AUTO_APPROVED: "Auto-approved Applications",
        PENDING_DOCS: "Incomplete Applications",
        PENDING_MANUAL_APPROVAL: "Pending Applications",
        APPROVED: "Approved Applications",
        REJECTED: "Rejected Applications",
    }


class FinancialAid(TimestampedModel):
    """
    An application for financial aid/personal pricing
    """
    user = models.ForeignKey(User, null=False)
    tier_program = models.ForeignKey(TierProgram, null=False)
    status = models.CharField(
        null=False,
        choices=[(status, status) for status in FinancialAidStatus.ALL_STATUSES],
        default=FinancialAidStatus.CREATED,
        max_length=30,
    )
    income_usd = models.FloatField(null=True)
    original_income = models.FloatField(null=True)
    original_currency = models.CharField(null=True, max_length=10)
    country_of_income = models.CharField(null=True, max_length=100)
    date_exchange_rate = models.DateTimeField(null=True)


class FinancialAidAudit(TimestampedModel):
    """
    Audit table for the Financial Aid
    """
    user = models.ForeignKey(User, null=False)
    table_changed = models.CharField(null=False, max_length=50)
    data_before = JSONField(blank=True, null=False)
    data_after = JSONField(blank=True, null=False)
    date = models.DateTimeField(null=False)


class CurrencyExchangeRate(TimestampedModel):
    """
    Table of currency exchange rates
    """
    currency_code = models.CharField(null=False, max_length=3)
    exchange_rate = models.FloatField(null=False)
