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

from dashboard.factories import ProgramEnrollmentFactory
from discussions import api
from discussions.exceptions import (
    ChannelCreationException,
    ContributorSyncException,
    DiscussionUserSyncException,
    ModeratorSyncException,
    SubscriberSyncException,
)
from discussions.factories import ChannelFactory
from discussions.models import (
    Channel,
    DiscussionUser,
)
from profiles.factories import (
    ProfileFactory,
    UserFactory,
)
from search.models import PercolateQuery

pytestmark = pytest.mark.django_db


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


def test_sync_user_to_channels(mocker, patched_users_api):
    """sync_user_to_channels should add or remove the user's membership from channels"""
    member_channels = [ChannelFactory.create() for _ in range(4)]
    nonmember_channels = [ChannelFactory.create() for _ in range(3)]

    user = ProgramEnrollmentFactory.create().user
    enrollment = ProgramEnrollmentFactory.create(user=user)

    assert PercolateQuery.objects.count() == len(member_channels) + len(nonmember_channels)

    def _search_percolate_queries(enrollment_id, discussion_type):
        """Helper function to return a percolate queryset for enrollment"""
        if enrollment_id == enrollment.id:
            return PercolateQuery.objects.filter(channel__in=member_channels)
        else:
            return PercolateQuery.objects.none()

    search_percolate_queries_stub = mocker.patch(
        'discussions.api.search_percolate_queries',
        autospec=True,
        side_effect=_search_percolate_queries
    )
    add_to_channel_stub = mocker.patch('discussions.api.add_to_channel', autospec=True)
    remove_from_channel_stub = mocker.patch('discussions.api.remove_from_channel', autospec=True)

    api.sync_user_to_channels(user.id)

    assert search_percolate_queries_stub.call_count == user.programenrollment_set.count()
    for enrollment in user.programenrollment_set.all():
        search_percolate_queries_stub.assert_any_call(
            enrollment.id,
            PercolateQuery.DISCUSSION_CHANNEL_TYPE,
        )
    assert add_to_channel_stub.call_count == len(member_channels)
    assert remove_from_channel_stub.call_count == len(nonmember_channels)
    for channel in member_channels:
        add_to_channel_stub.assert_any_call(channel.name, user.discussion_user.username)
    for channel in nonmember_channels:
        remove_from_channel_stub.assert_any_call(channel.name, user.discussion_user.username)


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

    contributors = [UserFactory.create() for _ in range(5)]
    contributor_ids = [user.id for user in contributors]
    search_for_field_stub = mocker.patch(
        'discussions.api.search_for_field',
        autospec=True,
        return_value=contributor_ids,
    )
    add_users_task_stub = mocker.patch('discussions.api.add_users_to_channel')

    moderator = UserFactory.create()
    moderator_name = moderator.discussion_user.username

    channel = api.add_channel(
        original_search=input_search,
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
        moderator_username=moderator_name,
    )

    mock_staff_client.channels.create.assert_called_once_with(
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
    )
    adjust_search_for_percolator_stub.assert_called_once_with(input_search)
    mock_staff_client.channels.add_moderator.assert_called_once_with(
        name, moderator_name
    )

    assert channel.name == name
    query = channel.query
    assert query.source_type == PercolateQuery.DISCUSSION_CHANNEL_TYPE
    assert query.original_query == input_search.to_dict()
    assert query.query == modified_search.to_dict()

    assert search_for_field_stub.call_count == 1
    assert search_for_field_stub.call_args[0][0].to_dict() == modified_search.to_dict()
    assert search_for_field_stub.call_args[0][1] == 'user_id'

    add_users_task_stub.assert_called_once_with(channel.name, contributor_ids)


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
            "mod",
        )
    assert ex.value.args[0] == "Error creating channel name"
    mock_staff_client.channels.create.return_value.raise_for_status.assert_called_with()
    assert mock_staff_client.channels.create.call_count == 1
    assert PercolateQuery.objects.count() == 0
    assert Channel.objects.count() == 0


def test_add_channel_failed_add_moderator(mock_staff_client, mocker):
    """If add_moderator fails an exception should be raised"""
    mock_staff_client.channels.add_moderator.return_value.raise_for_status.side_effect = HTTPError

    with pytest.raises(ModeratorSyncException) as ex:
        api.add_channel(
            Search.from_dict({}),
            "title",
            "name",
            "public_description",
            "channel_type",
            "mod",
        )
    assert ex.value.args[0] == "Error adding {moderator} as moderator to channel {channel}".format(
        moderator='mod',
        channel='name',
    )

    assert mock_staff_client.channels.create.called is True
    mock_staff_client.channels.add_moderator.return_value.raise_for_status.assert_called_with()


def test_add_channel_channel_already_exists(mock_staff_client):
    """Channel already exists with that channel name"""
    mock_staff_client.channels.create.return_value.ok = True
    ChannelFactory.create(name="name")

    title = "title"
    name = "name"
    public_description = "public description"
    channel_type = "private"
    input_search = Search.from_dict({"unmodified": "search"})

    with pytest.raises(IntegrityError):
        api.add_channel(
            original_search=input_search,
            title=title,
            name=name,
            public_description=public_description,
            channel_type=channel_type,
            moderator_username='mod',
        )

    mock_staff_client.channels.create.assert_called_once_with(
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
    )


def test_add_users_to_channel(mocker):
    """
    add_users_to_channel should add a number of users as contributors and subscribers, retrying if necessary
    """
    def _make_fake_discussionuser(user_id):
        """Helper function to make a mock DiscussionUser"""
        return mocker.Mock(username='discussion_user_{}'.format(user_id))

    stub = mocker.patch(
        'discussions.api.create_or_update_discussion_user',
        autospec=True,
        side_effect=_make_fake_discussionuser
    )
    add_to_channel_stub = mocker.patch('discussions.api.add_to_channel', autospec=True)

    users = [UserFactory.create() for _ in range(5)]
    channel_name = 'channel_name'
    api.add_users_to_channel(channel_name, [user.id for user in users])
    for user in users:
        stub.assert_any_call(user.id)
        add_to_channel_stub.assert_any_call(channel_name, "discussion_user_{}".format(user.id))


def test_add_users_to_channel_retry(patched_users_api, mocker):
    """
    add_users_to_channel should retry up to three times
    """

    failed_username = None

    def _raise_once(_, username):
        """Helper function to store the failed user id and raise an exception"""
        nonlocal failed_username
        if failed_username is None:
            failed_username = username
            raise TypeError

    add_to_channel_stub = mocker.patch('discussions.api.add_to_channel', autospec=True, side_effect=_raise_once)

    users = [UserFactory.create() for _ in range(5)]
    channel_name = 'channel_name'
    api.add_users_to_channel(channel_name, [user.id for user in users])
    for user in users:
        add_to_channel_stub.assert_any_call(channel_name, user.discussion_user.username)

    # There should be one extra call, for the retry after failure
    assert add_to_channel_stub.call_count == len(users) + 1


def test_add_users_to_channel_failed(patched_users_api, mocker):
    """
    If the retry count is exceeded an exception should be raised
    """
    failed_username = None

    def _raise_once(_, username):
        """Helper function to store the failed user id and raise an exception"""
        nonlocal failed_username
        if failed_username is None:
            failed_username = username
            raise TypeError
        elif username == failed_username:
            raise TypeError

    add_to_channel_stub = mocker.patch('discussions.api.add_to_channel', autospec=True, side_effect=_raise_once)

    users = [UserFactory.create() for _ in range(5)]
    with pytest.raises(DiscussionUserSyncException) as ex:
        api.add_users_to_channel('channel', [user.id for user in users])
    assert ex.value.args[0] == "Unable to sync these users: {}".format(
        [DiscussionUser.objects.get(username=failed_username).user.id]
    )

    # there are 3 retries
    assert add_to_channel_stub.call_count == 2 + len(users)
