"""Models related to search"""

from micromasters.models import TimestampedModel

from django.contrib.postgres.fields import JSONField
from django.db.models.fields import TextField


class PercolateQuery(TimestampedModel):
    """An elasticsearch query used in percolate"""
    original_query = JSONField()
    filters = JSONField()

    def __str__(self):
        return "Percolate query {id}: filters={filters}".format(
            id=self.id,
            filters=self.filters,
        )
