"""API for open discussions integration"""
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from open_discussions_api.client import OpenDiscussionsApi
from open_discussions_api.constants import ROLE_STAFF
from requests.exceptions import HTTPError

from discussions.models import (
    Channel,
    ChannelProgram,
    DiscussionUser,
)
from discussions.exceptions import (
    ChannelCreationException,
    ContributorSyncException,
    DiscussionUserSyncException,
    ModeratorSyncException,
    SubscriberSyncException,
)
from roles.models import Role
from roles.roles import Permissions
from search.api import (
    adjust_search_for_percolator,
    search_for_field,
    search_percolate_queries,
)
from search.models import PercolateQuery


log = logging.getLogger(__name__)


def get_staff_client():
    """
    Gets a client configured for user management
    """
    if not settings.OPEN_DISCUSSIONS_JWT_SECRET:
        raise ImproperlyConfigured('OPEN_DISCUSSIONS_JWT_SECRET must be set')
    if not settings.OPEN_DISCUSSIONS_BASE_URL:
        raise ImproperlyConfigured('OPEN_DISCUSSIONS_BASE_URL must be set')
    if not settings.OPEN_DISCUSSIONS_API_USERNAME:
        raise ImproperlyConfigured('OPEN_DISCUSSIONS_API_USERNAME must be set')

    return OpenDiscussionsApi(
        settings.OPEN_DISCUSSIONS_JWT_SECRET,
        settings.OPEN_DISCUSSIONS_BASE_URL,
        settings.OPEN_DISCUSSIONS_API_USERNAME,
        roles=[ROLE_STAFF]
    )


def create_or_update_discussion_user(user_id):
    """
    Create or update a DiscussionUser record and sync it

    Args:
        user_id (int): user id of the user to sync

    Returns:
        DiscussionUser: The DiscussionUser connected to the user
    """
    discussion_user, _ = DiscussionUser.objects.get_or_create(user_id=user_id)

    with transaction.atomic():
        discussion_user = (
            DiscussionUser.objects.select_for_update()
            .select_related('user')
            .get(id=discussion_user.id)
        )

        # defer decision to create or update the profile until we have a lock
        if discussion_user.username is None:
            create_discussion_user(discussion_user)
        else:
            update_discussion_user(discussion_user)

        return discussion_user


def create_discussion_user(discussion_user):
    """
    Creates the user's discussion user and profile

    Args:
        discussion_user (profiles.models.DiscussionUser): discussion user to create

    Raises:
        DiscussionUserSyncException: if there was an error syncing the profile
    """
    profile = discussion_user.user.profile

    api = get_staff_client()
    result = api.users.create(
        name=profile.full_name,
        image=profile.image.url if profile.image else None,
        image_small=profile.image_small.url if profile.image_small else None,
        image_medium=profile.image_medium.url if profile.image_medium else None,
    )

    try:
        result.raise_for_status()
    except HTTPError as ex:
        raise DiscussionUserSyncException(
            "Error creating discussion user for {}".format(profile.user.username)
        ) from ex

    discussion_user.username = result.json()['username']
    discussion_user.last_sync = profile.updated_on
    discussion_user.save()


def update_discussion_user(discussion_user):
    """
    Updates the user's discussion user profile

    Args:
        discussion_user (profiles.models.DiscussionUser): discussion user to update

    Raises:
        DiscussionUserSyncException: if there was an error syncing the profile
    """
    profile = discussion_user.user.profile

    if discussion_user.last_sync is not None and profile.updated_on <= discussion_user.last_sync:
        return

    api = get_staff_client()
    result = api.users.update(
        discussion_user.username,
        name=profile.full_name,
        image=profile.image.url if profile.image else None,
        image_small=profile.image_small.url if profile.image_small else None,
        image_medium=profile.image_medium.url if profile.image_medium else None,
    )

    try:
        result.raise_for_status()
    except HTTPError as ex:
        raise DiscussionUserSyncException(
            "Error updating discussion user for {}".format(profile.user.username)
        ) from ex

    discussion_user.last_sync = profile.updated_on
    discussion_user.save()


def add_contributor_to_channel(channel_name, discussion_username):
    """
    Add user to channel as a contributor

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    admin_client = get_staff_client()
    try:
        admin_client.channels.add_contributor(channel_name, discussion_username).raise_for_status()
    except HTTPError as ex:
        raise ContributorSyncException("Error adding contributor {user} to channel {channel}".format(
            user=discussion_username,
            channel=channel_name,
        )) from ex


def add_moderator_to_channel(channel_name, discussion_username):
    """
    Add user to channel as a moderator

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    admin_client = get_staff_client()
    try:
        admin_client.channels.add_moderator(channel_name, discussion_username).raise_for_status()
    except HTTPError as ex:
        raise ModeratorSyncException("Error adding moderator {user} to channel {channel}".format(
            user=discussion_username,
            channel=channel_name,
        )) from ex


def add_subscriber_to_channel(channel_name, discussion_username):
    """
    Add a subscriber to channel

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    admin_client = get_staff_client()
    try:
        admin_client.channels.add_subscriber(channel_name, discussion_username).raise_for_status()
    except HTTPError as ex:
        raise SubscriberSyncException("Error adding subscriber {user} to channel {channel}".format(
            user=discussion_username,
            channel=channel_name,
        )) from ex


def remove_contributor_from_channel(channel_name, discussion_username):
    """
    Remove contributor from a channel

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    admin_client = get_staff_client()
    try:
        admin_client.channels.remove_contributor(channel_name, discussion_username).raise_for_status()
    except HTTPError as ex:
        raise ContributorSyncException("Unable to remove a contributor {user} from channel {channel}".format(
            user=discussion_username,
            channel=channel_name
        )) from ex


def remove_subscriber_from_channel(channel_name, discussion_username):
    """
    Remove subscriber from a channel

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    admin_client = get_staff_client()

    try:
        admin_client.channels.remove_subscriber(channel_name, discussion_username).raise_for_status()
    except HTTPError as ex:
        raise SubscriberSyncException("Unable to remove a subscriber {user} from channel {channel}".format(
            user=discussion_username,
            channel=channel_name,
        )) from ex


def add_to_channel(channel_name, discussion_username):
    """
    Add a user to channel as contributor and subscriber

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    # This is done in this order because a user cannot be added as a subscriber
    # to a private channel without first being a contributor
    add_contributor_to_channel(channel_name, discussion_username)
    add_subscriber_to_channel(channel_name, discussion_username)


def remove_from_channel(channel_name, discussion_username):
    """
    Remove a user from a channel as contributor and subscriber

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    # If the channel is private and the user is not a contributor, their subscription status will always
    # look like it's false. To work around this we always remove the subscriber first.
    remove_subscriber_from_channel(channel_name, discussion_username)
    remove_contributor_from_channel(channel_name, discussion_username)


def sync_user_to_channels(user_id):
    """
    Make sure the user's profile exists on open-discussions,
    then update user's subscription and contributor status.

    Args:
        user_id (int): A user id
    """
    # This guards against a race condition where the user's profile is in a celery task
    # and hasn't yet actually been created
    user = User.objects.get(id=user_id)
    discussion_user = create_or_update_discussion_user(user_id)

    mod_channel_ids = set(
        Role.objects.filter(
            role__in=Role.permission_to_roles[Permissions.CAN_CREATE_FORUMS],
            user_id=user_id,
        ).values_list('program__channelprogram__channel__id', flat=True)
    )

    # If the user is a moderator of a channel, don't adjust their status. It should remain as before,
    # they should be subscriber, moderator and not a contributor.
    all_channel_ids = set(Channel.objects.values_list("id", flat=True)).difference(mod_channel_ids)

    membership_channel_ids = set()
    for enrollment_id in user.programenrollment_set.values_list("id", flat=True):
        queries = search_percolate_queries(enrollment_id, PercolateQuery.DISCUSSION_CHANNEL_TYPE)
        membership_channel_ids.update(queries.values_list("channel__id", flat=True))
    # Make sure we don't include extra channels beyond what's in all_channel_ids
    membership_channel_ids = membership_channel_ids.intersection(all_channel_ids)

    membership_channels = Channel.objects.filter(id__in=membership_channel_ids)
    for channel in membership_channels:
        add_to_channel(channel.name, discussion_user.username)

    nonmembership_channels = Channel.objects.filter(
        id__in=all_channel_ids.difference(membership_channel_ids)
    )
    for channel in nonmembership_channels:
        remove_from_channel(channel.name, discussion_user.username)


def add_channel(
        original_search, title, name, public_description, channel_type, program_id,
):  # pylint: disable=too-many-arguments
    """
    Add the channel and associated query

    Args:
        original_search (Search):
            The original search, which contains all back end filtering but no filtering specific to mail
            or for percolated queries.
        title (str): Title of the channel
        name (str): Name of the channel
        public_description (str): Description for the channel
        channel_type (str): Whether the channel is public or private
        program_id (int): The program id to connect the new channel to

    Returns:
        Channel: A new channel object
    """
    client = get_staff_client()
    try:
        client.channels.create(
            title=title,
            name=name,
            public_description=public_description,
            channel_type=channel_type,
        ).raise_for_status()
    except HTTPError as ex:
        raise ChannelCreationException("Error creating channel {}".format(name)) from ex

    updated_search = adjust_search_for_percolator(original_search)
    with transaction.atomic():
        percolate_query = PercolateQuery.objects.create(
            original_query=original_search.to_dict(),
            query=updated_search.to_dict(),
            source_type=PercolateQuery.DISCUSSION_CHANNEL_TYPE,
        )
        channel = Channel.objects.create(
            query=percolate_query,
            name=name,
        )
        ChannelProgram.objects.create(
            channel=channel,
            program_id=program_id,
        )

    # Do a one time sync of all matching profiles
    user_ids = list(search_for_field(updated_search, 'user_id'))
    from discussions import tasks
    tasks.add_moderators_to_channel.delay(channel.name)
    tasks.add_users_to_channel.delay(channel.name, user_ids)
    return channel


def add_users_to_channel(channel_name, user_ids, retries=3):
    """
    Add users to a open-discussions channel as contributors and subscribers

    Args:
        channel_name (str): The name of the channel
        user_ids (list of int): profile ids to sync
        retries (int):
            Number of times to resync failed profiles. This is independent of Celery's retry mechanism
            because we want to only retry the failed profiles.
    """

    failed_user_ids = []
    for user_id in user_ids:
        try:
            # This guards against a race condition where the user's profile is in a celery task
            # and hasn't yet actually been created
            discussion_user = create_or_update_discussion_user(user_id)

            add_to_channel(channel_name, discussion_user.username)
        except:  # pylint: disable=bare-except
            log.exception(
                "Error syncing user channel membership for user id #%s, channel %s",
                user_id,
                channel_name,
            )
            failed_user_ids.append(user_id)

    if len(failed_user_ids) > 0:
        if retries > 1:
            add_users_to_channel(channel_name, failed_user_ids, retries - 1)
        else:
            raise DiscussionUserSyncException("Unable to sync these users: {}".format(failed_user_ids))


def add_moderators_to_channel(channel_name):
    """
    Add moderators to a channel

    Args:
        channel_name (str): The name of the channel
    """
    mod_ids = Role.objects.filter(
        role__in=Role.permission_to_roles[Permissions.CAN_CREATE_FORUMS],
        program__channelprogram__channel__name=channel_name,
    ).values_list('user', flat=True)

    for mod_id in mod_ids:
        discussion_user = create_or_update_discussion_user(mod_id)
        add_moderator_to_channel(channel_name, discussion_user.username)
        add_subscriber_to_channel(channel_name, discussion_user.username)
