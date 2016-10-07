"""
Models for the Financial Aid App
"""
import datetime

from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.core.exceptions import ValidationError
from django.db import (
    models,
    transaction,
)
from django.forms.models import model_to_dict

from courses.models import Program
from financialaid.constants import FinancialAidStatus


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

    def __str__(self):
        return self.name


class TierProgram(TimestampedModel):
    """
    The tiers for discounted pricing assigned to a program
    """
    program = models.ForeignKey(Program, null=False, related_name="tier_programs")
    tier = models.ForeignKey(Tier, null=False, related_name="tier_programs")
    discount_amount = models.IntegerField(null=False)
    current = models.BooleanField(null=False, default=False)
    income_threshold = models.IntegerField(null=False)

    class Meta:
        unique_together = ('program', 'tier')

    def __str__(self):
        return 'tier "{0}" for program "{1}"'.format(self.tier.name, self.program.title)

    @transaction.atomic
    def save(self, *args, **kwargs):
        """
        Override the save to enforce the existence of only one `current` = True
        per program and tier
        """
        if self.current:
            TierProgram.objects.filter(program=self.program, tier=self.tier, current=True).update(current=False)
        return super(TierProgram, self).save(*args, **kwargs)


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
    date_documents_sent = models.DateField(null=True, blank=True)
    justification = models.TextField(null=True)

    def to_dict(self):
        """
        Get the model_to_dict of self
        """
        ret = model_to_dict(self)
        if self.date_exchange_rate is not None:
            ret["date_exchange_rate"] = ret["date_exchange_rate"].isoformat()
        if self.date_documents_sent is not None:
            ret["date_documents_sent"] = ret["date_documents_sent"].isoformat()
        return ret

    def save(self, *args, **kwargs):
        """
        Override save to make sure only one FinancialAid object exists for a User and the associated Program
        """
        if FinancialAid.objects.filter(
                user=self.user,
                tier_program__program=self.tier_program.program
        ).exclude(id=self.id).exists():
            raise ValidationError("Cannot have multiple FinancialAid objects for the same User and Program.")
        super().save(*args, **kwargs)

    @transaction.atomic
    def save_and_log(self, acting_user, *args, **kwargs):
        """
        Saves the object and creates an audit object.
        """
        financialaid_before = FinancialAid.objects.get(id=self.id)
        self.save(*args, **kwargs)
        self.refresh_from_db()
        FinancialAidAudit.objects.create(
            acting_user=acting_user,
            financial_aid=self,
            data_before=financialaid_before.to_dict(),
            data_after=self.to_dict()
        )


class FinancialAidAudit(TimestampedModel):
    """
    Audit table for the Financial Aid
    """
    acting_user = models.ForeignKey(User, null=False)
    financial_aid = models.ForeignKey(FinancialAid, null=True, on_delete=models.SET_NULL)
    data_before = JSONField(blank=True, null=False)
    data_after = JSONField(blank=True, null=False)


class CurrencyExchangeRate(TimestampedModel):
    """
    Table of currency exchange rates for converting foreign currencies into USD
    """
    currency_code = models.CharField(null=False, max_length=3)
    exchange_rate = models.FloatField(null=False)  # how much foreign currency is per 1 USD


class CountryIncomeThreshold(TimestampedModel):
    """
    Table of country income thresholds for financial aid auto approval
    """
    country_code = models.CharField(null=False, max_length=2)
    income_threshold = models.IntegerField(null=False)
