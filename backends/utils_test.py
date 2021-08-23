"""
Tests for the utils
"""
from datetime import timedelta
from unittest.mock import (
    MagicMock,
    patch,
)

import pytest
from requests.exceptions import HTTPError

from backends import utils
from backends.constants import BACKEND_EDX_ORG
from backends.edxorg import EdxOrgOAuth2
from micromasters.utils import now_in_utc
from profiles.factories import UserFactory
from search.base import MockedESTestCase
# pylint: disable=protected-access


social_extra_data = {
    "access_token": "fooooootoken",
    "refresh_token": "baaaarrefresh",
}


class RefreshTest(MockedESTestCase):
    """Class to test refresh token"""

    @classmethod
    def setUpTestData(cls):
        super(RefreshTest, cls).setUpTestData()
        # create an user
        cls.user = UserFactory.create()
        # create a social auth for the user
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.user.username),
            extra_data=social_extra_data
        )

    def setUp(self):
        super().setUp()
        self.now = now_in_utc()

    def update_social_extra_data(self, data):
        """Helper function to update the python social auth extra data"""
        social_user = self.user.social_auth.get(provider=EdxOrgOAuth2.name)
        social_user.extra_data.update(data)
        social_user.save()
        return social_user

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_refresh(self, mock_refresh):
        """The refresh needs to be called"""
        extra_data = {
            "updated_at": (self.now - timedelta(weeks=1)).timestamp(),
            "expires_in": 100  # seconds
        }
        social_user = self.update_social_extra_data(extra_data)
        utils.refresh_user_token(social_user)
        assert mock_refresh.called

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_refresh_no_extradata(self, mock_refresh):
        """The refresh needs to be called because there is not valid timestamps"""
        social_user = self.user.social_auth.get(provider=EdxOrgOAuth2.name)
        social_user.extra_data = {"access_token": "fooooootoken", "refresh_token": "baaaarrefresh"}
        social_user.save()
        utils.refresh_user_token(social_user)
        assert mock_refresh.called

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_no_refresh(self, mock_refresh):
        """The refresh does not need to be called"""
        extra_data = {
            "updated_at": (self.now - timedelta(minutes=1)).timestamp(),
            "expires_in": 31535999  # 1 year - 1 second
        }
        social_user = self.update_social_extra_data(extra_data)
        utils.refresh_user_token(social_user)
        assert not mock_refresh.called

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_refresh_400_error_server(self, mock_refresh):
        """Test to check what happens when the OAUTH server returns 400 code"""
        def raise_http_error(*args, **kwargs):  # pylint: disable=unused-argument
            """Mock function to raise an exception"""
            error = HTTPError()
            error.response = MagicMock()
            error.response.status_code = 400
            raise error

        mock_refresh.side_effect = raise_http_error
        social_user = self.user.social_auth.get(provider=EdxOrgOAuth2.name)
        with self.assertRaises(utils.InvalidCredentialStored):
            utils._send_refresh_request(social_user)

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_refresh_401_error_server(self, mock_refresh):
        """Test to check what happens when the OAUTH server returns 401 code"""
        def raise_http_error(*args, **kwargs):  # pylint: disable=unused-argument
            """Mock function to raise an exception"""
            error = HTTPError()
            error.response = MagicMock()
            error.response.status_code = 401
            raise error

        mock_refresh.side_effect = raise_http_error
        social_user = self.user.social_auth.get(provider=EdxOrgOAuth2.name)
        with self.assertRaises(utils.InvalidCredentialStored):
            utils._send_refresh_request(social_user)

    @patch('backends.edxorg.EdxOrgOAuth2.refresh_token', return_value=social_extra_data, autospec=True)
    def test_refresh_500_error_server(self, mock_refresh):
        """Test to check what happens when the OAUTH server returns 500 code"""
        def raise_http_error(*args, **kwargs):  # pylint: disable=unused-argument
            """Mock function to raise an exception"""
            error = HTTPError()
            error.response = MagicMock()
            error.response.status_code = 500
            raise error

        mock_refresh.side_effect = raise_http_error
        social_user = self.user.social_auth.get(provider=EdxOrgOAuth2.name)
        with self.assertRaises(HTTPError):
            utils._send_refresh_request(social_user)

@pytest.mark.django_db
def test_update_email():
    """Verify that update_email updates the user's email"""
    new_email = "test1@localhost"
    user = UserFactory.create(email="test2@localhost")
    utils.update_email({'email': new_email}, user)
    user.refresh_from_db()
    assert user.email == new_email

@pytest.mark.django_db
def test_has_social_auth():
    """Test has_social auth returns False if social auth does not exist"""
    user = UserFactory.create(email="test2@localhost")

    assert utils.has_social_auth(user, BACKEND_EDX_ORG) is False
    user.social_auth.create(
        provider=BACKEND_EDX_ORG,
        uid="{}_edx".format(user.username),
        extra_data=social_extra_data
    )
    assert utils.has_social_auth(user, BACKEND_EDX_ORG) is True
