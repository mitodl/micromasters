"""Tests for discussions API"""
# pylint: disable=redefined-outer-name
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
from django.db.utils import IntegrityError
from elasticsearch_dsl import Search
from factory.django import mute_signals
from open_discussions_api.constants import ROLE_STAFF
import pytest

from discussions import api
from discussions.exceptions import DiscussionUserSyncException, ChannelCreationException
from discussions.factories import ChannelFactory
from discussions.models import (
    Channel,
    DiscussionUser,
)
from profiles.factories import ProfileFactory
from search.models import PercolateQuery

pytestmark = pytest.mark.django_db


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


@pytest.mark.parametrize('status_code', [200, 300, 301, 400, 401, 403, 500])
def test_create_discussion_user_error(mock_staff_client, status_code):
    """Verify create_discussion_user handles non 201 status codes"""
    mock_staff_client.users.create.return_value.status_code = status_code
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    discussion_user = DiscussionUser.objects.create(user=profile.user)
    with pytest.raises(DiscussionUserSyncException) as exc:
        api.create_discussion_user(discussion_user)

    assert str(exc.value) == "Error creating discussion user, got status_code {}".format(status_code)


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


@pytest.mark.parametrize('status_code', [201, 300, 301, 400, 401, 403, 500])
def test_update_discussion_user_error(mock_staff_client, status_code):
    """Verify update_discussion_user handles non-200 status codes"""
    mock_staff_client.users.update.return_value.status_code = status_code
    with mute_signals(post_save):
        profile = ProfileFactory.create()
    discussion_user = DiscussionUser.objects.create(user=profile.user, username='username')
    with pytest.raises(DiscussionUserSyncException) as exc:
        api.update_discussion_user(discussion_user)

    assert str(exc.value) == "Error updating discussion user, got status_code {}".format(status_code)


def test_add_channel(mock_staff_client, mocker):
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
        return_value=modified_search,
    )
    channel = api.add_channel(
        original_search=input_search,
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
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


def test_add_channel_failed_create_channel(mock_staff_client):
    """If client.channels.create fails an exception should be raised"""
    mock_staff_client.channels.create.return_value.ok = False
    mock_staff_client.channels.create.return_value.content = "error message"

    with pytest.raises(ChannelCreationException) as ex:
        api.add_channel(Search.from_dict({}), "title", "name", "public_description", "channel_type")
    assert ex.value.args[0] == "Error creating channel: error message"
    assert mock_staff_client.channels.create.called is True
    assert PercolateQuery.objects.count() == 0
    assert Channel.objects.count() == 0


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
        )

    mock_staff_client.channels.create.assert_called_once_with(
        title=title,
        name=name,
        public_description=public_description,
        channel_type=channel_type,
    )
