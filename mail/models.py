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
    acting_user = models.ForeignKey(User, null=False, on_delete=models.CASCADE)
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
    staff_user = models.ForeignKey(User, null=True, on_delete=models.CASCADE)

    def __str__(self):
        """String representation of AutomaticEmail"""
        return "AutomaticEmail sender={}, subject={}".format(self.sender_name, self.email_subject)


class SentAutomaticEmail(TimestampedModel):
    """
    Keeps track of automatic emails which were sent to particular users
    """
    PENDING = 'pending'
    SENT = 'sent'

    STATUSES = [PENDING, SENT]

    user = models.ForeignKey(User, null=False, on_delete=models.CASCADE)
    automatic_email = models.ForeignKey(AutomaticEmail, null=False, on_delete=models.CASCADE)
    # This is used to aid the transaction in locking this row. SentAutomaticEmail will be created as PENDING
    # and then changed to SENT once a successful email was sent.
    status = models.CharField(
        max_length=30,
        choices=[(status, status) for status in STATUSES],
        default=PENDING,
    )

    class Meta:
        unique_together = ('user', 'automatic_email')

    def __str__(self):
        return "SentAutomaticEmail for user={user} and automatic_email={automatic_email}".format(
            user=self.user,
            automatic_email=self.automatic_email,
        )


class PartnerSchool(models.Model):
    """
    Model for partner school to send records to
    """

    name = models.CharField(max_length=255)
    email = models.TextField(null=False)
