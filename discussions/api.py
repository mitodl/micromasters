"""API for open discussions integration"""
import logging

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from open_discussions_api.client import OpenDiscussionsApi
from open_discussions_api.constants import ROLE_STAFF
from requests.exceptions import HTTPError
from rest_framework import status as statuses

from discussions.models import (
    Channel,
    ChannelProgram,
    DiscussionUser,
)
from discussions.exceptions import (
    DiscussionSyncException,
    ChannelCreationException,
    ChannelAlreadyExistsException,
    ContributorSyncException,
    DiscussionUserSyncException,
    ModeratorSyncException,
    SubscriberSyncException,
)
from discussions.utils import get_moderators_for_channel
from roles.models import Role
from roles.roles import Permissions
from search.api import adjust_search_for_percolator
from search.models import (
    PercolateQuery,
    PercolateQueryMembership,
)


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


def create_or_update_discussion_user(user_id, allow_email_optin=False):
    """
    Create or update a DiscussionUser record and sync it

    Args:
        user_id (int): user id of the user to sync
        allow_email_optin (bool): if True send email_optin in profile dict on users.update call

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
            if settings.FEATURES.get('OPEN_DISCUSSIONS_USER_UPDATE', True):
                update_discussion_user(discussion_user, allow_email_optin=allow_email_optin)
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
        profile.user.username,
        email=profile.user.email,
        profile=dict(
            name=profile.full_name,
            image=profile.image.url if profile.image else None,
            image_small=profile.image_small.url if profile.image_small else None,
            image_medium=profile.image_medium.url if profile.image_medium else None,
            email_optin=profile.email_optin
        )
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


def update_discussion_user(discussion_user, allow_email_optin=False):
    """
    Updates the user's discussion user profile

    Args:
        discussion_user (discussions.models.DiscussionUser): discussion user to update
        allow_email_optin (bool): if True send email_optin in profile dict on users.update call

    Raises:
        DiscussionUserSyncException: if there was an error syncing the profile
    """
    profile = discussion_user.user.profile

    if (
            not allow_email_optin and
            discussion_user.last_sync is not None and
            profile.updated_on <= discussion_user.last_sync
    ):
        return

    api = get_staff_client()
    profile_dict = dict(
        name=profile.full_name,
        image=profile.image.url if profile.image else None,
        image_small=profile.image_small.url if profile.image_small else None,
        image_medium=profile.image_medium.url if profile.image_medium else None,
    )

    if allow_email_optin:
        profile_dict["email_optin"] = profile.email_optin

    result = api.users.update(
        discussion_user.username,
        uid=profile.user.username,
        email=profile.user.email,
        profile=profile_dict
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


def remove_moderator_from_channel(channel_name, discussion_username):
    """
    Remove user to channel as a moderator

    Args:
        channel_name (str): An open-discussions channel
        discussion_username (str): The username used by open-discussions
    """
    admin_client = get_staff_client()
    try:
        admin_client.channels.remove_moderator(channel_name, discussion_username).raise_for_status()
    except HTTPError as ex:
        raise ModeratorSyncException("Error removing moderator {user} to channel {channel}".format(
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


def get_membership_ids_needing_sync():
    """
    Returns a list of memberships that need to be synced

    Returns:
        QuerySet: query for the list of database ids for memberships that need to be synced
    """
    # Order by is_member (True before False) and updated_on (most recent first)
    return PercolateQueryMembership.objects.filter(
        query__source_type=PercolateQuery.DISCUSSION_CHANNEL_TYPE,
        user__profile__isnull=False,
        needs_update=True
    ).order_by('-is_member', '-updated_on').values_list("id", flat=True)


def sync_channel_memberships(membership_ids):
    """
    Sync outstanding channel memberships

    Args:
        membership_ids (iterable of int): iterable of membership ids to sync
    """
    program_ids_by_channel_id = {
        channel_program.channel_id: channel_program.program_id
        for channel_program in ChannelProgram.objects.all()
    }

    for membership_id in membership_ids:
        with transaction.atomic():
            membership = (
                PercolateQueryMembership.objects
                .filter(id=membership_id)
                .prefetch_related('query__channels')
                .select_for_update()
                .first()
            )

            channel = membership.query.channels.first()

            # if we can't look up the program, skip this one
            # this covers a race condition where a PercolateQueryMembership is selected
            # for a channel that wasn't present when program_ids_by_channel_id was queried
            if channel is None or channel.id not in program_ids_by_channel_id:
                continue

            # if the user is a moderator, don't manipulate subscriptions
            if Role.objects.filter(
                    role__in=Role.permission_to_roles[Permissions.CAN_CREATE_FORUMS],
                    user_id=membership.user_id,
                    program_id=program_ids_by_channel_id[channel.id],
            ).exists():
                membership.needs_update = False
                membership.save()
            else:
                try:
                    # This guards against a race condition where the user's profile is in a celery task
                    # and hasn't yet actually been created
                    discussion_user = create_or_update_discussion_user(membership.user_id)

                    if membership.is_member:
                        add_to_channel(channel.name, discussion_user.username)
                    else:
                        remove_from_channel(channel.name, discussion_user.username)

                    membership.needs_update = False
                    membership.save()
                except DiscussionSyncException:
                    log.exception("Error updating channel membership")


def add_channel(
        original_search, title, name, description, channel_type, program_id, creator_id,
):  # pylint: disable=too-many-arguments
    """
    Add the channel and associated query

    Args:
        original_search (Search):
            The original search, which contains all back end filtering but no filtering specific to mail
            or for percolated queries.
        title (str): Title of the channel
        name (str): Name of the channel
        description (str): Description for the channel
        channel_type (str): Whether the channel is public or private
        program_id (int): The program id to connect the new channel to
        creator_id (int): The user id of the creator of a channel

    Returns:
        Channel: A new channel object
    """
    client = get_staff_client()
    try:
        client.channels.create(
            title=title,
            name=name,
            description=description,
            channel_type=channel_type,
        ).raise_for_status()
    except HTTPError as ex:
        if ex.response.status_code == statuses.HTTP_409_CONFLICT:
            raise ChannelAlreadyExistsException("Channel {} already exists".format(name)) from ex
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

    from discussions import tasks as discussions_tasks
    discussions_tasks.add_moderators_to_channel.delay(channel.name)

    # populate memberships based on the enrollments we found now
    # subsequent matches will be picked up via indexing
    from search import tasks as search_tasks
    search_tasks.populate_query_memberships.delay(percolate_query.id)

    # The creator is added in add_moderators_to_channel but do it here also to prevent a race condition
    # where the user is redirected to the channel page before they have permission to access it.
    discussion_user = create_or_update_discussion_user(creator_id)
    add_and_subscribe_moderator(discussion_user.username, channel.name)

    return channel


def add_moderators_to_channel(channel_name):
    """
    Add moderators to a channel

    Args:
        channel_name (str): The name of the channel
    """
    mod_ids = get_moderators_for_channel(channel_name)

    for mod_id in mod_ids:
        discussion_user = create_or_update_discussion_user(mod_id)
        add_and_subscribe_moderator(discussion_user.username, channel_name)


def add_and_subscribe_moderator(discussion_username, channel_name):
    """
    Add and subscribe a moderator to a channels

    Args:
        discussion_username (str): discussion username
        channel_name (str): The name of the channel
    """
    add_moderator_to_channel(channel_name, discussion_username)
    add_subscriber_to_channel(channel_name, discussion_username)
