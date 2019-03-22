"""
Models for user profile
"""
from django.conf import settings
from django.db import models

from courses.models import Program
from search.models import PercolateQuery
from micromasters.models import TimestampedModel


class DiscussionUser(TimestampedModel):
    """
    Tracks the user's discussion user and profile
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="discussion_user")
    username = models.CharField(max_length=26, null=True)
    last_sync = models.DateTimeField(null=True)

    def __str__(self):
        return "Discussion Profile: {}".format(self.username)


class Channel(TimestampedModel):
    """
    Represents an open-discussions channel and a percolate query which specifies its membership
    """
    name = models.TextField(unique=True)
    query = models.ForeignKey(PercolateQuery, null=True, on_delete=models.SET_NULL, related_name='channels')
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return "Channel: {}".format(self.name)


class ChannelProgram(models.Model):
    """
    Represents a link between a channel and a program, used to determine who is staff of the channel
    """
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    program = models.ForeignKey(Program, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('channel', 'program')

    def __str__(self):
        return "ChannelProgram: {program} {channel}".format(
            program=self.program,
            channel=self.channel,
        )
