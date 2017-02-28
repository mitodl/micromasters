"""
Models for mail
"""
from django.contrib.auth.models import User
from django.db import models

from financialaid.models import FinancialAid
from micromasters.models import TimestampedModel
from search.models import PercolateQuery


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


class AutomaticEmail(TimestampedModel):
    """
    Stores information for an automatically sent email
    """
    query = models.ForeignKey(PercolateQuery, null=True, on_delete=models.SET_NULL)
    enabled = models.BooleanField(default=False)
    email_subject = models.TextField(null=False, blank=True)
    email_body = models.TextField(null=False, blank=True)
    sender_name = models.TextField(null=False, blank=True)

    def __str__(self):
        """String representation of AutomaticEmail"""
        return "AutomaticEmail sender={}, subject={}".format(self.sender_name, self.email_subject)
