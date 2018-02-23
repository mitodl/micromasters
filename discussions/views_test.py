"""
Tests for discussions views
"""
from django.urls import reverse
import pytest
from rest_framework import status as statuses
from rest_framework.test import (
    APIClient,
)

from discussions.exceptions import ChannelAlreadyExistsException
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
    response = client.get(reverse('discussions'), follow=True)
    assert response.redirect_chain[0] == ('http://localhost/', 302)
    assert 'jwt_cookie' in response.client.cookies
    assert response.client.cookies['jwt_cookie'] is not None


def test_logged_in_user_redirect_no_discussion_user(client, patched_users_api):
    """
    Tests that logged in user gets cookie and redirect
    """
    user = UserFactory.create()
    user.discussion_user.delete()

    client.force_login(user)
    response = client.get(reverse('discussions'), follow=True)
    assert response.redirect_chain[0] == ('http://localhost/', 302)
    assert 'jwt_cookie' in response.client.cookies
    assert response.client.cookies['jwt_cookie'] is not None


def _make_create_channel_input(program_id, description="default description"):
    """Generate parameters for create API"""
    return {
        "title": "title",
        "name": "name",
        "description": description,
        "channel_type": "public",
        "query": {},
        "program_id": program_id,
    }


@pytest.mark.parametrize("description", ["public description", ""])
def test_create_channel(description, mocker, patched_users_api):
    """superuser can create a channel using the REST API"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    role.user.is_superuser = True
    role.user.save()

    client.force_login(role.user)

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
        "description": create_channel_input['description'],
        "channel_type": create_channel_input['channel_type'],
        "query": channel.query.query,
        "program_id": role.program.id,
    }

    kwargs = add_channel_mock.call_args[1]
    assert kwargs['title'] == create_channel_input['title']
    assert kwargs['name'] == channel.name
    assert kwargs['description'] == create_channel_input['description']
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


def test_create_channel_anonymous(mocker, patched_users_api):
    """Anonymous users should get a 401 error"""
    client = APIClient()
    program = RoleFactory.create().program
    add_channel_mock = mocker.patch('discussions.serializers.add_channel', return_value={}, autospec=True)
    resp = client.post(reverse('channel-list'), data=_make_create_channel_input(program.id), format="json")
    assert add_channel_mock.called is False
    assert resp.status_code == 403


def test_create_channel_normal_user(mocker, patched_users_api):
    """If a user is not a superuser they should get a forbidden status"""
    client = APIClient()
    user = UserFactory.create()
    client.force_login(user)
    program = RoleFactory.create().program
    add_channel_mock = mocker.patch('discussions.serializers.add_channel', return_value={}, autospec=True)
    resp = client.post(reverse('channel-list'), data=_make_create_channel_input(program.id), format="json")
    assert add_channel_mock.called is False
    assert resp.status_code == 403


def test_create_channel_staff_non_superuser(mocker, patched_users_api):
    """a staff role user who is not superuser should also get a forbidden status"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    client.force_login(role.user)
    program = role.program
    add_channel_mock = mocker.patch('discussions.serializers.add_channel', return_value={}, autospec=True)
    resp = client.post(reverse('channel-list'), data=_make_create_channel_input(program.id), format="json")
    assert add_channel_mock.called is False
    assert resp.status_code == 403


@pytest.mark.parametrize("missing_param", ["title", "name", "channel_type", "query"])
def test_create_channel_missing_param(missing_param, patched_users_api):
    """A missing param should cause a validation error"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    role.user.is_superuser = True
    role.user.save()
    client.force_login(role.user)
    inputs = {**_make_create_channel_input(role.program.id)}
    del inputs[missing_param]
    resp = client.post(reverse('channel-list'), data=inputs, format="json")
    assert resp.status_code == 400
    assert resp.json() == {
        missing_param: ["This field is required."]
    }


def test_create_channel_bad_program_id(patched_users_api):
    """A bad program ID should cause a validation error"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    role.user.is_superuser = True
    role.user.save()
    client.force_login(role.user)
    inputs = _make_create_channel_input("invalid_program_id")
    resp = client.post(reverse('channel-list'), data=inputs, format="json")
    assert resp.status_code == 400
    assert resp.json() == {
        "program_id": ['A valid integer is required.']
    }


def test_create_channel_duplicate(mocker, patched_users_api):
    """creating a duplicate channel should return an error"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    role.user.is_superuser = True
    role.user.save()
    client.force_login(role.user)

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
    assert resp.json() == {"name": "A channel with that name already exists"}
