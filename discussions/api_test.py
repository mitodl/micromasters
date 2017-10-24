"""Tests for discussions API"""
# pylint: disable=redefined-outer-name
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.db.utils import IntegrityError
from elasticsearch_dsl import Search
from factory.django import mute_signals
from open_discussions_api.constants import ROLE_STAFF
import pytest
from requests.exceptions import HTTPError
from rest_framework import status as statuses

from courses.factories import ProgramFactory
from dashboard.factories import ProgramEnrollmentFactory
from discussions import api
from discussions.exceptions import (
    ChannelCreationException,
    ContributorSyncException,
    DiscussionUserSyncException,
    ModeratorSyncException,
    SubscriberSyncException,
)
from discussions.factories import (
    ChannelFactory,
    ChannelProgramFactory,
)
from discussions.models import (
    Channel,
    ChannelProgram,
    DiscussionUser,
)
from profiles.factories import (
    ProfileFactory,
    UserFactory,
)
from roles.factories import RoleFactory
from roles.roles import Staff
from search.models import (
    PercolateQuery,
    PercolateQueryMembership,
)

pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.usefixtures('mocked_on_commit'),
    pytest.mark.django_db,
]


# pylint: disable=too-many-locals, unused-argument
@pytest.fixture
def mock_staff_client(mocker):
    """Mocks the staff client"""
    return mocker.patch('discussions.api.get_staff_client').return_value


@pytest.mark.parametrize("secret, base_url, username", [
    (None, 'base_url', 'username'),
    ('secret', None, 'username'),
    ('secret', 'base_url', None),
])
def test_get_staff_client_config_errors(settings, secret, base_url, username):
    """Assert that get_staff_client raises config errors"""
    settings.OPEN_DISCUSSIONS_JWT_SECRET = secret
    settings.OPEN_DISCUSSIONS_BASE_URL = base_url
    settings.OPEN_DISCUSSIONS_API_USERNAME = username

    with pytest.raises(ImproperlyConfigured):
        api.get_staff_client()


def test_get_staff_client_config_valid(settings):
    """Test that get_staff_client returns a configured client"""
    settings.OPEN_DISCUSSIONS_JWT_SECRET = 'secret'
    settings.OPEN_DISCUSSIONS_BASE_URL = 'base_url'
    settings.OPEN_DISCUSSIONS_API_USERNAME = 'username'
    assert api.get_staff_client().roles == [ROLE_STAFF]


def test_create_or_update_discussion_user_no_username(mocker):
    """Test that create_or_update_discussion_user creates if we don't have a username"""
    create_mock = mocker.patch('discussions.api.create_discussion_user')
    update_mock = mocker.patch('discussions.api.update_discussion_user')
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    assert DiscussionUser.objects.count() == 0
    api.create_or_update_discussion_user(profile.user_id)
    assert create_mock.call_count == 1
    assert update_mock.call_count == 0
    assert DiscussionUser.objects.count() == 1


def test_create_or_update_discussion_user_has_username(mocker):
    """Test that create_or_update_discussion_user updates if we have a username"""
    create_mock = mocker.patch('discussions.api.create_discussion_user')
    update_mock = mocker.patch('discussions.api.update_discussion_user')
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    DiscussionUser.objects.create(user=profile.user, username='username')
    api.create_or_update_discussion_user(profile.user_id)
    assert create_mock.call_count == 0
    assert update_mock.call_count == 1
    assert DiscussionUser.objects.count() == 1


def test_create_discussion_user(mock_staff_client):
    """Verify create_discussion_user makes the correct API calls"""
    mock_response = mock_staff_client.users.create.return_value
    mock_response.status_code = 201
    mock_response.json.return_value = {
        'username': 'username'
    }
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    discussion_user = DiscussionUser.objects.create(user=profile.user)
    api.create_discussion_user(discussion_user)
    assert discussion_user.username == 'username'
    mock_staff_client.users.create.assert_called_once_with(
        name=profile.full_name,
        image=profile.image.url,
        image_small=profile.image_small.url,
        image_medium=profile.image_medium.url,
    )


def test_create_discussion_user_error(mock_staff_client):
    """Verify create_discussion_user handles non 2xx status codes"""
    mock_staff_client.users.create.return_value.raise_for_status.side_effect = HTTPError
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    discussion_user = DiscussionUser.objects.create(user=profile.user)
    with pytest.raises(DiscussionUserSyncException) as exc:
        api.create_discussion_user(discussion_user)

    assert str(exc.value) == "Error creating discussion user for {}".format(profile.user.username)


def test_update_discussion_user(mock_staff_client):
    """Verify update_discussion_user makes the correct API calls"""
    mock_response = mock_staff_client.users.update.return_value
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'username': 'username'
    }
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    discussion_user = DiscussionUser.objects.create(user=profile.user, username='username')
    api.update_discussion_user(discussion_user)
    mock_staff_client.users.update.assert_called_once_with(
        discussion_user.username,
        name=profile.full_name,
        image=profile.image.url,
        image_small=profile.image_small.url,
        image_medium=profile.image_medium.url,
    )


def test_update_discussion_user_no_update(mock_staff_client):
    """Verify update_discussion_user makes the correct API calls"""
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    discussion_user = DiscussionUser.objects.create(user=profile.user, username='user1', last_sync=profile.updated_on)
    api.update_discussion_user(discussion_user)
    assert mock_staff_client.users.update.call_count == 0


def test_update_discussion_user_error(mock_staff_client):
    """Verify update_discussion_user handles non-2xx status codes"""
    mock_staff_client.users.update.return_value.raise_for_status.side_effect = HTTPError
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    discussion_user = DiscussionUser.objects.create(user=profile.user, username='username')
    with pytest.raises(DiscussionUserSyncException) as exc:
        api.update_discussion_user(discussion_user)

    assert str(exc.value) == "Error updating discussion user for {}".format(profile.user.username)


def test_add_to_channel(mock_staff_client):
    """add_to_channel should add user as contributor and subscriber"""
    channel_name = 'channel'
    discussion_username = 'username'
    api.add_to_channel(channel_name, discussion_username)
    mock_staff_client.channels.add_contributor.assert_called_once_with(channel_name, discussion_username)
    mock_staff_client.channels.add_subscriber.assert_called_once_with(channel_name, discussion_username)


def test_add_to_channel_failed_contributor(mock_staff_client):
    """add_to_channel should raise an exception if it fails to add a contributor"""
    mock_staff_client.channels.add_contributor.return_value.raise_for_status.side_effect = HTTPError
    with pytest.raises(ContributorSyncException) as ex:
        api.add_to_channel('channel', 'user')
    assert ex.value.args[0] == 'Error adding contributor user to channel channel'
    assert mock_staff_client.channels.add_subscriber.called is False


def test_add_to_channel_failed_subscriber(mock_staff_client):
    """add_to_channel should raise an exception if it fails to add a subscriber"""
    channel_name = 'channel'
    discussion_username = 'username'
    mock_staff_client.channels.add_subscriber.return_value.raise_for_status.side_effect = HTTPError
    with pytest.raises(SubscriberSyncException) as ex:
        api.add_to_channel(channel_name, discussion_username)
    assert ex.value.args[0] == 'Error adding subscriber {user} to channel {channel}'.format(
        user=discussion_username,
        channel=channel_name,
    )

    mock_staff_client.channels.add_contributor.assert_called_once_with(channel_name, discussion_username)
    mock_staff_client.channels.add_subscriber.assert_called_once_with(channel_name, discussion_username)


@pytest.mark.parametrize("contributor_status_code,subscriber_status_code", [
    (statuses.HTTP_200_OK, statuses.HTTP_200_OK),
    (statuses.HTTP_404_NOT_FOUND, statuses.HTTP_404_NOT_FOUND),
    (statuses.HTTP_409_CONFLICT, statuses.HTTP_404_NOT_FOUND),
])
def test_remove_from_channel(mock_staff_client, contributor_status_code, subscriber_status_code):
    """remove_from_channel should remove a user's contributor and subscriber status"""
    channel_name = 'channel'
    discussion_username = 'username'
    api.remove_from_channel(channel_name, discussion_username)
    mock_staff_client.channels.remove_contributor.assert_called_once_with(channel_name, discussion_username)
    mock_staff_client.channels.remove_subscriber.assert_called_once_with(channel_name, discussion_username)


@pytest.mark.parametrize("status_code", [
    statuses.HTTP_400_BAD_REQUEST,
    statuses.HTTP_401_UNAUTHORIZED,
    statuses.HTTP_403_FORBIDDEN,
    statuses.HTTP_500_INTERNAL_SERVER_ERROR,
    statuses.HTTP_505_HTTP_VERSION_NOT_SUPPORTED
])
def test_remove_from_channel_failed_contributor(mock_staff_client, status_code):
    """
    remove_from_channel should raise an exception if it fails to remove a user's contributor status,
    depending on the status code
    """
    channel_name = 'channel'
    discussion_username = 'user'
    response = mock_staff_client.channels.remove_contributor.return_value
    response.ok = False
    response.status_code = status_code
    response.raise_for_status.side_effect = HTTPError

    with pytest.raises(ContributorSyncException) as ex:
        api.remove_from_channel(channel_name, discussion_username)
    assert ex.value.args[0] == 'Unable to remove a contributor user from channel channel'
    mock_staff_client.channels.remove_contributor.assert_called_once_with(channel_name, discussion_username)
    mock_staff_client.channels.remove_subscriber.assert_called_once_with(channel_name, discussion_username)


@pytest.mark.parametrize("status_code", [
    statuses.HTTP_400_BAD_REQUEST,
    statuses.HTTP_401_UNAUTHORIZED,
    statuses.HTTP_403_FORBIDDEN,
    statuses.HTTP_409_CONFLICT,
    statuses.HTTP_500_INTERNAL_SERVER_ERROR,
    statuses.HTTP_505_HTTP_VERSION_NOT_SUPPORTED
])
def test_remove_from_channel_failed_subscriber(mock_staff_client, status_code):
    """
    remove_from_channel should raise an exception if it fails to remove a user's subscriber status,
    depending on the status code
    """
    mock_staff_client.channels.remove_contributor.return_value.ok = True
    response = mock_staff_client.channels.remove_subscriber.return_value
    response.ok = False
    response.status_code = status_code
    response.raise_for_status.side_effect = HTTPError
    channel_name = 'channel'
    discussion_username = 'username'

    with pytest.raises(SubscriberSyncException) as ex:
        api.remove_from_channel(channel_name, discussion_username)
    assert ex.value.args[0] == 'Unable to remove a subscriber username from channel channel'
    mock_staff_client.channels.remove_subscriber.assert_called_once_with(channel_name, discussion_username)
    assert mock_staff_client.channels.remove_contributor.called is False


def test_sync_channel_memberships(mocker, patched_users_api):
    """
    sync_user_to_channels should add or remove the user's membership from channels, not touching channels where
    the user is a moderator of at least one program
    """
    user = UserFactory.create()

    # member here means the user matches the percolate query of the channel
    member_channels = [ChannelFactory.create() for _ in range(4)]
    nonmember_channels = [ChannelFactory.create() for _ in range(3)]

    # first channel of members and first channel of nonmembers are skipped since user is staff
    channels_to_add = member_channels[1:]
    channels_to_remove = nonmember_channels[1:]

    # User is a staff of some channels and not of others.
    # Note that a staff user may or may not match the percolate query or a channel
    staff_programs = [
        ChannelProgramFactory.create(channel=member_channels[0]).program,
        ChannelProgramFactory.create(channel=nonmember_channels[0]).program,
    ]
    non_staff_programs = [
        ChannelProgramFactory.create(channel=channel).program
        for channel in (channels_to_add + channels_to_remove)
    ]

    memberships_to_add = [
        PercolateQueryMembership.objects.create(user=user, query=channel.query, needs_update=True, is_member=True)
        for channel in member_channels
    ]

    memberships_to_remove = [
        PercolateQueryMembership.objects.create(user=user, query=channel.query, needs_update=True, is_member=False)
        for channel in nonmember_channels
    ]
    for program in staff_programs:
        RoleFactory.create(program=program, user=user, role=Staff.ROLE_ID)

    # Enroll the user in all programs. This isn't technically required but it's unrealistic to have a query
    # matching a user if they are not enrolled in the program.
    for program in staff_programs + non_staff_programs:
        ProgramEnrollmentFactory.create(program=program, user=user)

    # One percolate query per channel
    assert PercolateQuery.objects.count() == len(member_channels) + len(nonmember_channels)

    add_subscriber_stub = mocker.patch(
        'discussions.api.add_subscriber_to_channel',
        autospec=True,
    )
    add_contributor_stub = mocker.patch(
        'discussions.api.add_contributor_to_channel',
        autospec=True,
    )
    remove_subscriber_stub = mocker.patch(
        'discussions.api.remove_subscriber_from_channel',
        autospec=True,
    )
    remove_contributor_stub = mocker.patch(
        'discussions.api.remove_contributor_from_channel',
        autospec=True,
    )

    api.sync_channel_memberships()

    created_stub, _ = patched_users_api
    created_stub.assert_any_call(user.discussion_user)

    assert add_subscriber_stub.call_count == len(channels_to_add)
    assert add_contributor_stub.call_count == len(channels_to_add)
    assert remove_subscriber_stub.call_count == len(channels_to_remove)
    assert remove_contributor_stub.call_count == len(channels_to_remove)

    for membership in memberships_to_add + memberships_to_remove:
        membership.refresh_from_db()
        assert membership.needs_update is False

    for channel in channels_to_add:
        add_subscriber_stub.assert_any_call(channel.name, user.discussion_user.username)
        add_contributor_stub.assert_any_call(channel.name, user.discussion_user.username)
    for channel in channels_to_remove:
        remove_contributor_stub.assert_any_call(channel.name, user.discussion_user.username)
        remove_subscriber_stub.assert_any_call(channel.name, user.discussion_user.username)


def test_add_channel(mock_staff_client, mocker, patched_users_api):
    """add_channel should tell open-discussions to create a channel"""
    mock_staff_client.channels.create.return_value.ok = True

    title = "title"
    name = "name"
    public_description = "public description"
    channel_type = "private"
    input_search = Search.from_dict({"unmodified": "search"})
    modified_search = Search.from_dict({"result": "modified"})

    adjust_search_for_percolator_stub = mocker.patch(
        'discussions.api.adjust_search_for_percolator',
        autospec=True,
        return_value=modified_search,
    )

    program = ProgramFactory.create()
    contributors = [UserFactory.create() for _ in range(5)]
    for user in contributors:
        ProgramEnrollmentFactory.create(user=user, program=program)
    populate_memberships_task_stub = mocker.patch('search.api.populate_query_memberships', autospec=True)
    add_moderators_task_stub = mocker.patch('discussions.api.add_moderators_to_channel', autospec=True)
    add_subscriber_stub = mocker.patch('discussions.api.add_subscriber_to_channel', autospec=True)
    add_moderator_stub = mocker.patch('discussions.api.add_moderator_to_channel', autospec=True)

    mod = UserFactory.create()
    channel = api.add_channel(
        original_search=input_search,
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
        program_id=program.id,
        creator_id=mod.id,
    )

    mock_staff_client.channels.create.assert_called_once_with(
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
    )
    adjust_search_for_percolator_stub.assert_called_once_with(input_search)

    assert channel.name == name
    query = channel.query
    assert query.source_type == PercolateQuery.DISCUSSION_CHANNEL_TYPE
    assert query.original_query == input_search.to_dict()
    assert query.query == modified_search.to_dict()

    assert ChannelProgram.objects.count() == 1
    channel_program = ChannelProgram.objects.first()
    assert channel_program.program == program
    assert channel_program.channel == channel

    populate_memberships_task_stub.assert_called_once_with(query.id)
    add_moderators_task_stub.assert_called_once_with(channel.name)

    add_subscriber_stub.assert_called_once_with(channel.name, mod.discussion_user.username)
    add_moderator_stub.assert_called_once_with(channel.name, mod.discussion_user.username)
    _, updated_stub = patched_users_api
    updated_stub.assert_any_call(mod.discussion_user)


def test_add_channel_failed_create_channel(mock_staff_client, mocker):
    """If client.channels.create fails an exception should be raised"""
    mock_staff_client.channels.create.return_value.raise_for_status.side_effect = HTTPError

    with pytest.raises(ChannelCreationException) as ex:
        api.add_channel(
            Search.from_dict({}),
            "title",
            "name",
            "public_description",
            "channel_type",
            123,
            456,
        )
    assert ex.value.args[0] == "Error creating channel name"
    mock_staff_client.channels.create.return_value.raise_for_status.assert_called_with()
    assert mock_staff_client.channels.create.call_count == 1
    assert PercolateQuery.objects.count() == 0
    assert Channel.objects.count() == 0


def test_add_channel_channel_already_exists(mock_staff_client, patched_users_api):
    """Channel already exists with that channel name"""
    mock_staff_client.channels.create.return_value.ok = True
    ChannelFactory.create(name="name")

    title = "title"
    name = "name"
    public_description = "public description"
    channel_type = "private"
    input_search = Search.from_dict({"unmodified": "search"})
    role = RoleFactory.create()
    mod = UserFactory.create()

    with pytest.raises(IntegrityError):
        api.add_channel(
            original_search=input_search,
            title=title,
            name=name,
            public_description=public_description,
            channel_type=channel_type,
            program_id=role.program.id,
            creator_id=mod.id,
        )

    mock_staff_client.channels.create.assert_called_once_with(
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
    )


def test_add_moderators_to_channel(mocker, patched_users_api):
    """add_moderators_to_channel should add staff or instructors as moderators and subscribers"""
    channel = ChannelFactory.create()
    mods = []
    for _ in range(3):
        program = ChannelProgramFactory.create(channel=channel).program
        mods += [RoleFactory.create(program=program).user for _ in range(5)]

        for __ in range(5):
            # Add some users to the channel to show that being part of the channel is not enough to be added as a mod
            ProgramEnrollmentFactory.create(program=program)

    _, updated_stub = patched_users_api
    updated_stub.reset_mock()
    add_subscriber_stub = mocker.patch('discussions.api.add_subscriber_to_channel', autospec=True)
    add_moderator_stub = mocker.patch('discussions.api.add_moderator_to_channel', autospec=True)
    api.add_moderators_to_channel(channel.name)

    for mod in mods:
        add_subscriber_stub.assert_any_call(channel.name, mod.discussion_user.username)
        add_moderator_stub.assert_any_call(channel.name, mod.discussion_user.username)
        updated_stub.assert_any_call(mod.discussion_user)

    assert add_subscriber_stub.call_count == len(mods)
    assert add_moderator_stub.call_count == len(mods)
    assert updated_stub.call_count == len(mods)


def test_add_moderator_to_channel(mock_staff_client):
    """add_moderator_to_channel should add a moderator to a channel"""
    api.add_moderator_to_channel('channel', 'user')

    mock_staff_client.channels.add_moderator.assert_called_once_with('channel', 'user')


def test_add_moderator_to_channel_failed(mock_staff_client):
    """If there's a non-2xx status code, add_moderator_to_channel raise an exception"""
    mock_staff_client.channels.add_moderator.return_value.raise_for_status.side_effect = HTTPError
    with pytest.raises(ModeratorSyncException):
        api.add_moderator_to_channel('channel', 'user')

    mock_staff_client.channels.add_moderator.assert_called_once_with('channel', 'user')
