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
    to_email = models.CharField(null=False, max_length=250)
    from_email = models.CharField(null=False, max_length=250)
    email_subject = models.CharField(null=False, max_length=250)
    email_body = models.TextField(null=False)
