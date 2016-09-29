"""
Models for mail
"""
from django.contrib.auth.models import User
from django.db import models

from financialaid.models import TimestampedModel, FinancialAid


class FinancialAidEmailAudit(TimestampedModel):
    """
    Audit table for the Financial Aid
    """
    acting_user = models.ForeignKey(User, null=False)
    financial_aid = models.ForeignKey(FinancialAid, null=True, on_delete=models.SET_NULL)
    to_email = models.TextField(null=False)
    from_email = models.TextField(null=False)
    email_subject = models.TextField(null=False, blank=True)
    email_body = models.TextField(null=False, blank=True)
