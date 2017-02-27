"""Models related to search"""

from micromasters.models import TimestampedModel

from django.contrib.postgres.fields import JSONField


class PercolateQuery(TimestampedModel):
    """An elasticsearch query used in percolate"""
    query = JSONField()

    def __str__(self):
        return "Percolate query {}: {}".format(self.id, self.query)
