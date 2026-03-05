"""
Tests for mail utils
"""

from unittest.mock import Mock
from requests import Response
from rest_framework import status

from mail.utils import (
    generate_mailgun_response_json,
    filter_recipient_variables,
    RECIPIENT_VARIABLE_NAMES,
)
from mail.views_test import mocked_json
from search.base import MockedESTestCase


class MailUtilsTests(MockedESTestCase):
    """
    Tests for mail utils
    """
    def test_generate_mailgun_response_json(self):
        """
        Tests that generate_mailgun_response_json() returns response.json()
        """
        response = Mock(
            spec=Response,
            status_code=status.HTTP_200_OK,
            json=mocked_json()
        )
        assert generate_mailgun_response_json(response) == response.json()

    def test_generate_mailgun_response_json_with_failed_json_call(self):
        """
        Tests that generate_mailgun_response_json() returns without erroring if Response.json() call fails for
        non 401 status code
        """
        # Response.json() error
        response = Mock(
            spec=Response,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            json=lambda: (_ for _ in []).throw(ValueError),  # To get .json() to throw ValueError
            reason="reason"
        )
        self.assertDictEqual(
            generate_mailgun_response_json(response),
            {"message": response.reason}
        )

    def test_filter_recipient_variables(self):
        """
        Test that recipient variables get to mailgun format, e.g. %recipient.[variable_name]%
        """
        text = ' '.join(map('[{}]'.format, RECIPIENT_VARIABLE_NAMES.keys()))
        result = ' '.join(map('%recipient.{}%'.format, RECIPIENT_VARIABLE_NAMES.values()))
        assert filter_recipient_variables(text) == result
