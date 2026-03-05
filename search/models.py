"""Models related to search"""
from django.conf import settings
from django.db import models
from django.db.models import JSONField

from micromasters.models import TimestampedModel


class PercolateQuery(TimestampedModel):
    """An opensearch query used in percolate"""
    AUTOMATIC_EMAIL_TYPE = 'automatic_email_type'

    SOURCE_TYPES = [
        AUTOMATIC_EMAIL_TYPE,
    ]

    original_query = JSONField()
    query = JSONField()
    source_type = models.CharField(max_length=255, choices=[(choice, choice) for choice in SOURCE_TYPES])
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Percolate query {self.id}: {self.query}"


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
        return f"Percolate query membership: user: {self.user_id}, query: {self.query_id}"

    class Meta:
        unique_together = (('user', 'query'),)
