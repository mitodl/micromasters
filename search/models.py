"""Models related to search"""
from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models

from micromasters.models import TimestampedModel


class PercolateQuery(TimestampedModel):
    """An elasticsearch query used in percolate"""
    AUTOMATIC_EMAIL_TYPE = 'automatic_email_type'
    DISCUSSION_CHANNEL_TYPE = 'discussion_channel_type'

    SOURCE_TYPES = [
        AUTOMATIC_EMAIL_TYPE,
        DISCUSSION_CHANNEL_TYPE,
    ]

    original_query = JSONField()
    query = JSONField()
    source_type = models.CharField(max_length=255, choices=[(choice, choice) for choice in SOURCE_TYPES])
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return "Percolate query {}: {}".format(self.id, self.query)


class PercolateQueryMembership(TimestampedModel):
    """
    A user's membership in a PercolateQuery. There should be roughly
    count(users) * count(percolate_query) rows in this model
    (some users will be missing if they don't have ProgramEnrollments),
    for percolate queries connected to channels.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="percolate_memberships")
    query = models.ForeignKey(PercolateQuery, on_delete=models.CASCADE, related_name="percolate_memberships")

    is_member = models.BooleanField(default=False)
    needs_update = models.BooleanField(default=False)

    def __str__(self):
        return "Percolate query membership: user: {}, query: {}".format(self.user_id, self.query_id)

    class Meta:
        unique_together = (('user', 'query'),)
