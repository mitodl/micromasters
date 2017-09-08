"""API for open discussions integration"""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from open_discussions_api.client import OpenDiscussionsApi
from open_discussions_api.constants import ROLE_STAFF

from discussions.models import (
    DiscussionUser,
    Channel,
)
from discussions.exceptions import (
    ChannelCreationException,
    DiscussionUserSyncException,
)
from search.api import adjust_search_for_percolator
from search.models import PercolateQuery


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
        user_id (str): user id of the user to sync
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

    if result.status_code == 201:
        discussion_user.username = result.json()['username']
        discussion_user.last_sync = profile.updated_on
        discussion_user.save()
    else:
        raise DiscussionUserSyncException(
            "Error creating discussion user, got status_code {}".format(result.status_code)
        )


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

    if result.status_code == 200:
        discussion_user.last_sync = profile.updated_on
        discussion_user.save()
    else:
        raise DiscussionUserSyncException(
            "Error updating discussion user, got status_code {}".format(result.status_code)
        )


def add_channel(original_search, title, name, public_description, channel_type):
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

    Returns:
        Channel: A new channel object
    """
    client = get_staff_client()
    response = client.channels.create(
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
    )
    if not response.ok:
        raise ChannelCreationException("Error creating channel: {}".format(response.content))

    updated_search = adjust_search_for_percolator(original_search)
    with transaction.atomic():
        percolate_query = PercolateQuery.objects.create(
            original_query=original_search.to_dict(),
            query=updated_search.to_dict(),
            source_type=PercolateQuery.DISCUSSION_CHANNEL_TYPE,
        )
        return Channel.objects.create(
            query=percolate_query,
            name=name,
        )
