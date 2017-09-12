"""
Tests for discussions views
"""
from django.core.urlresolvers import reverse

import pytest
from rest_framework.test import (
    APIClient,
)

from discussions.factories import ChannelFactory
from micromasters.factories import UserFactory
from roles.factories import RoleFactory
from roles.models import Staff

pytestmark = pytest.mark.django_db


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
    assert response.status_code == 409
    assert 'jwt_cookie' not in response.client.cookies


CREATE_CHANNEL_INPUT = {
    "title": "title",
    "name": "name",
    "public_description": "public description",
    "channel_type": "public",
    "query": {}
}


def test_create_channel(mocker, patched_users_api):
    """Staff can create a channel using the REST API"""
    client = APIClient()
    role = RoleFactory.create(role=Staff.ROLE_ID)
    user = role.user
    client.force_login(user)

    channel = ChannelFactory.create()
    add_channel_mock = mocker.patch('discussions.serializers.add_channel', return_value=channel, autospec=True)

    resp = client.post(reverse('channel-list'), data={
        **CREATE_CHANNEL_INPUT,
        "name": channel.name,
    }, format="json")
    assert resp.status_code == 201
    assert resp.json() == {
        "name": channel.name,
        "title": CREATE_CHANNEL_INPUT['title'],
        "public_description": CREATE_CHANNEL_INPUT['public_description'],
        "channel_type": CREATE_CHANNEL_INPUT['channel_type'],
        "query": channel.query.query,
    }

    kwargs = add_channel_mock.call_args[1]
    assert kwargs['title'] == CREATE_CHANNEL_INPUT['title']
    assert kwargs['name'] == channel.name
    assert kwargs['public_description'] == CREATE_CHANNEL_INPUT['public_description']
    assert kwargs['channel_type'] == CREATE_CHANNEL_INPUT['channel_type']
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


def test_create_channel_anonymous():
    """Anonymous users should get a 401 error"""
    client = APIClient()
    resp = client.post(reverse('channel-list'), data=CREATE_CHANNEL_INPUT, format="json")
    assert resp.status_code == 403


def test_create_channel_user_without_permission(patched_users_api):
    """If a user doesn't have permission to create the channel they should get a forbidden status"""
    client = APIClient()
    user = UserFactory.create()
    client.force_login(user)
    resp = client.post(reverse('channel-list'), data=CREATE_CHANNEL_INPUT, format="json")
    assert resp.status_code == 403


@pytest.mark.parametrize("missing_param", ["title", "name", "public_description", "channel_type", "query"])
def test_create_channel_missing_param(missing_param, patched_users_api):
    """A missing param should cause a validation error"""
    client = APIClient()
    user = RoleFactory.create(role=Staff.ROLE_ID).user
    client.force_login(user)
    inputs = dict(CREATE_CHANNEL_INPUT)
    del inputs[missing_param]
    resp = client.post(reverse('channel-list'), data=inputs, format="json")
    assert resp.status_code == 400
    assert resp.json() == {
        missing_param: ["This field is required."]
    }
