"""
Tests for discussions views
"""
from django.core.urlresolvers import reverse
import pytest
from rest_framework import status as statuses
from rest_framework.test import (
    APIClient,
)

from discussions.exceptions import (
    ChannelAlreadyExistsException,
    UnableToAuthenticateDiscussionUserException,
)
from discussions.factories import ChannelFactory
from micromasters.factories import UserFactory
from roles.factories import RoleFactory
from roles.models import Staff

pytestmark = [
    pytest.mark.usefixtures('mocked_elasticsearch'),
    pytest.mark.usefixtures('mocked_on_commit'),
    pytest.mark.django_db,
]


# pylint: disable=unused-argument
def test_anonymous_user_jwt_api(client):
    """
    Tests that anonymous users gets no token
    """
    response = client.get(reverse('discussions_token'))
    assert response.json() == dict(has_token=False)
    assert response.status_code == 403
    assert 'jwt_cookie' not in response.client.cookies


def test_user_jwt_api(client, patched_users_api):
    """
    Tests that anonymous users gets no token
    """
    user = UserFactory.create()
    user.discussion_user.username = 'username'
    user.discussion_user.save()

    client.force_login(user)
    response = client.get(reverse('discussions_token'))
    assert response.json() == dict(has_token=True)
    assert 'jwt_cookie' in response.client.cookies
    assert response.client.cookies['jwt_cookie'] is not None


def test_anonymous_user_403(client):
    """
    Tests that anonymous users get a 403
    """
    response = client.get(reverse('discussions'))
    assert response.status_code == 302
    assert response.url == '/?next={}'.format(reverse('discussions'))
    assert 'jwt_cookie' not in response.client.cookies


def test_logged_in_user_redirect(client, patched_users_api):
    """
    Tests that logged in user gets cookie and redirect
    """
    user = UserFactory.create()
    user.discussion_user.username = 'username'
    user.discussion_user.save()

    client.force_login(user)
    response = client.get(reverse('discussions'), follow=True)
    assert response.redirect_chain[0] == ('http://localhost/', 302)
    assert 'jwt_cookie' in response.client.cookies
    assert response.client.cookies['jwt_cookie'] is not None


def test_logged_in_user_redirect_no_username(client, patched_users_api):
    """
    Tests that logged in user gets cookie and redirect
    """
    user = UserFactory.create()
    user.discussion_user.username = None
    user.discussion_user.save()

    client.force_login(user)
    with pytest.raises(UnableToAuthenticateDiscussionUserException):
        client.get(reverse('discussions'))


def _make_create_channel_input(program_id, description="default description"):
    """Generate parameters for create API"""
    return {
        "title": "title",
        "name": "name",
        "public_description": description,
        "channel_type": "public",
        "query": {},
        "program_id": program_id,
    }


@pytest.mark.parametrize("description", ["public description", ""])
def test_create_channel(description, mocker, patched_users_api):
    """Staff can create a channel using the REST API"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    user = role.user
    client.force_login(user)

    channel = ChannelFactory.create()
    add_channel_mock = mocker.patch('discussions.serializers.add_channel', return_value=channel, autospec=True)

    create_channel_input = _make_create_channel_input(role.program.id, description)
    resp = client.post(reverse('channel-list'), data={
        **create_channel_input,
        "name": channel.name,
    }, format="json")
    assert resp.status_code == 201
    assert resp.json() == {
        "name": channel.name,
        "title": create_channel_input['title'],
        "public_description": create_channel_input['public_description'],
        "channel_type": create_channel_input['channel_type'],
        "query": channel.query.query,
        "program_id": role.program.id,
    }

    kwargs = add_channel_mock.call_args[1]
    assert kwargs['title'] == create_channel_input['title']
    assert kwargs['name'] == channel.name
    assert kwargs['public_description'] == create_channel_input['public_description']
    assert kwargs['channel_type'] == create_channel_input['channel_type']
    assert kwargs['original_search'].to_dict() == {
        'query': {
            'bool': {
                'filter': [
                    {
                        'bool': {
                            'minimum_should_match': 1,
                            'must': [{'term': {'program.is_learner': True}}],
                            'should': [{
                                'term': {'program.id': role.program.id}
                            }]
                        }
                    },
                    {
                        'term': {'profile.filled_out': True}
                    }
                ]
            }
        },
        'size': 50
    }
    assert kwargs['program_id'] == role.program.id


def test_create_channel_anonymous(patched_users_api):
    """Anonymous users should get a 401 error"""
    client = APIClient()
    program = RoleFactory.create().program
    resp = client.post(reverse('channel-list'), data=_make_create_channel_input(program.id), format="json")
    assert resp.status_code == 403


def test_create_channel_user_without_permission(patched_users_api):
    """If a user doesn't have permission to create the channel they should get a forbidden status"""
    client = APIClient()
    user = UserFactory.create()
    client.force_login(user)
    program = RoleFactory.create().program
    resp = client.post(reverse('channel-list'), data=_make_create_channel_input(program.id), format="json")
    assert resp.status_code == 403


@pytest.mark.parametrize("missing_param", ["title", "name", "channel_type", "query"])
def test_create_channel_missing_param(missing_param, patched_users_api):
    """A missing param should cause a validation error"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    client.force_login(role.user)
    inputs = {**_make_create_channel_input(role.program.id)}
    del inputs[missing_param]
    resp = client.post(reverse('channel-list'), data=inputs, format="json")
    assert resp.status_code == 400
    assert resp.json() == {
        missing_param: ["This field is required."]
    }


def test_create_channel_bad_program_id(patched_users_api):
    """A missing param should cause a validation error"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    client.force_login(role.user)
    inputs = {**_make_create_channel_input("invalid_program_id")}
    resp = client.post(reverse('channel-list'), data=inputs, format="json")
    assert resp.status_code == 400
    assert resp.json() == ["missing or invalid program id"]


def test_create_channel_duplicate(mocker, patched_users_api):
    """Staff can create a channel using the REST API"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    user = role.user
    client.force_login(user)

    channel = ChannelFactory.create()
    mocker.patch(
        'discussions.serializers.add_channel',
        side_effect=ChannelAlreadyExistsException,
        autospec=True,
    )

    create_channel_input = _make_create_channel_input(role.program.id, 'description')
    resp = client.post(reverse('channel-list'), data={
        **create_channel_input,
        "name": channel.name,
    }, format="json")
    assert resp.status_code == statuses.HTTP_409_CONFLICT
