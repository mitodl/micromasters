"""
Mark Channel and PercolateQuery deleted and updates all the memberships to is_member=False, need_update=True
"""
from django.core.management import BaseCommand, CommandError

from discussions.models import Channel
from discussions.tasks import remove_moderators_from_channel


class Command(BaseCommand):
    """
    Mark Channel and PercolateQuery deleted and updates all the memberships to is_member=False, need_update=True
    """
    help = 'Mark Channel and PercolateQuery deleted and updates all the memberships to ' \
           'is_member=False, need_update=True.'

    def add_arguments(self, parser):
        parser.add_argument('channel_name', type=str)

    def handle(self, *args, **kwargs):  # pylint: disable=unused-argument
        channel_name = kwargs.get('channel_name')

        try:
            channel = Channel.objects.get(name=channel_name)
        except Channel.DoesNotExist:
            raise CommandError('Channel does not exists with name={channel_name}'.format(channel_name=channel_name))

        channel.is_deleted = True
        channel.save()

        percolate_query = channel.query
        percolate_query.is_deleted = True
        percolate_query.save()

        percolate_query.percolate_memberships.update(is_member=False, needs_update=True)

        self.stdout.write(
            self.style.SUCCESS('Channel and PercolateQuery marked as deleted and related memberships are update.')
        )

        remove_moderators_from_channel.delay(channel_name)
        self.stdout.write(
            self.style.SUCCESS('Async job to remove moderators is submitted')
        )
