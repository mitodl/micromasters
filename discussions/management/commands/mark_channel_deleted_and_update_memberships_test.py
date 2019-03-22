"""Tests for management command `mark_channel_deleted_and_update_memberships`"""
import pytest
from django.core.management import call_command, CommandError

from discussions.factories import ChannelFactory
from search.factories import PercolateQueryMembershipFactory

pytestmark = [
    pytest.mark.django_db,
]


def test_without_argument():
    """Tests that commands raises commands error if required argument not provided. """
    with pytest.raises(CommandError) as ex:
        call_command('mark_channel_deleted_and_update_memberships')

    assert str(ex.value) == 'Error: the following arguments are required: channel_name'


def test_channel_name_does_not_exist():
    """Test that command raises an error if channel name does not exists."""
    fake_name = 'fake_name'
    with pytest.raises(CommandError) as ex:
        call_command('mark_channel_deleted_and_update_memberships', 'fake_name')

    assert str(ex.value) == 'Channel does not exists with name={}'.format(fake_name)


def test_channel_marked_deleted():
    """ Test that command will mark channel as deleted."""

    channel = ChannelFactory()
    membership = PercolateQueryMembershipFactory.create(query=channel.query, is_member=True, needs_update=False)

    assert not channel.is_deleted
    assert not channel.query.is_deleted

    call_command('mark_channel_deleted_and_update_memberships', channel.name)

    channel.refresh_from_db()
    assert channel.is_deleted
    assert channel.query.is_deleted

    # is_member and needs_update should be updated
    membership.refresh_from_db()
    assert not membership.is_member
    assert membership.needs_update
