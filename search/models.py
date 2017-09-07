"""Models related to search"""

from micromasters.models import TimestampedModel

from django.contrib.postgres.fields import JSONField
from django.db.models import CharField


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
    source_type = CharField(max_length=255, choices=[(choice, choice) for choice in SOURCE_TYPES])

    def __str__(self):
        return "Percolate query {}: {}".format(self.id, self.query)
