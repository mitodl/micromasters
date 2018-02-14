"""pytest configuration for discussions tests"""
from factory import Faker
import pytest


# pylint: disable=unused-argument
def _update_discussion_user(discussion_user, allow_email_optin=False):
    """Helper function to create a DiscussionUser and update its username"""
    if discussion_user.username is None:
        discussion_user.username = Faker('user_name').generate({})
    discussion_user.last_sync = discussion_user.user.profile.updated_on
    discussion_user.save()


@pytest.fixture()
def patched_users_api(mocker):
    """Patch functions creating the user on open-discussions"""
    create = mocker.patch(
        'discussions.api.create_discussion_user', autospec=True, side_effect=_update_discussion_user
    )
    update = mocker.patch(
        'discussions.api.update_discussion_user', autospec=True, side_effect=_update_discussion_user
    )
    return create, update


@pytest.fixture(autouse=True)
def discussion_settings_everywhere(discussion_settings):
    """discussion_settings with autouse=True"""
