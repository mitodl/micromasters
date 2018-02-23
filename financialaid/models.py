"""
Models for the Financial Aid App
"""
from django.contrib.auth.models import User
from django.db import (
    models,
    transaction,
)
from rest_framework.exceptions import ValidationError

from courses.models import Program
from financialaid.constants import FinancialAidStatus
from micromasters.models import (
    AuditableModel,
    AuditModel,
    TimestampedModel,
)
from micromasters.utils import serialize_model_object


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
    program = models.ForeignKey(Program, null=False, related_name="tier_programs", on_delete=models.CASCADE)
    tier = models.ForeignKey(Tier, null=False, related_name="tier_programs", on_delete=models.CASCADE)
    discount_amount = models.IntegerField(null=False)
    current = models.BooleanField(null=False, default=False)
    income_threshold = models.IntegerField(null=False)

    class Meta:
        unique_together = ('program', 'tier')

    def __str__(self):
        return 'tier "{0}" for program "{1}"'.format(self.tier.name, self.program.title)

    @transaction.atomic
    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        """
        Override the save to enforce the existence of only one `current` = True
        per program and tier
        """
        if self.current:
            TierProgram.objects.filter(program=self.program, tier=self.tier, current=True).update(current=False)
        return super(TierProgram, self).save(*args, **kwargs)


class FinancialAid(TimestampedModel, AuditableModel):
    """
    An application for financial aid/personal pricing
    """
    user = models.ForeignKey(User, null=False, on_delete=models.CASCADE)
    tier_program = models.ForeignKey(TierProgram, null=False, on_delete=models.CASCADE)
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
    country_of_residence = models.TextField()

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        """
        Override save to make sure only one FinancialAid object exists for a User and the associated Program
        """
        # if this is a change just save
        if FinancialAid.objects.filter(id=self.id).exists():
            super().save(*args, **kwargs)
            return
        # otherwise see if we can create another one
        if FinancialAid.objects.filter(
                user=self.user,
                tier_program__program=self.tier_program.program
        ).exclude(status=FinancialAidStatus.RESET).exists():
            raise ValidationError("Cannot have multiple FinancialAid objects for the same User and Program.")
        super().save(*args, **kwargs)

    @classmethod
    def get_audit_class(cls):
        return FinancialAidAudit

    def to_dict(self):
        return serialize_model_object(self)

    def __str__(self):
        return 'FA for user "{user}" in status "{status}"'.format(
            user=self.user.username,
            status=self.status
        )


class FinancialAidAudit(AuditModel):
    """
    Audit table for the Financial Aid
    """
    financial_aid = models.ForeignKey(FinancialAid, null=True, on_delete=models.SET_NULL)

    @classmethod
    def get_related_field_name(cls):
        return 'financial_aid'


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
    country_code = models.CharField(null=False, unique=True, max_length=2)
    income_threshold = models.IntegerField(null=False)
