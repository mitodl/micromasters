"""
Oauth Backend Tests
"""
from unittest import TestCase

from social_django.utils import load_strategy

from backends.base import BaseEdxOAuth2


class BaseEdxOAuth2Tests(TestCase):
    """Tests for BaseEdxOAuth2"""
    def test_response_parsing(self):
        """
        Should have properly formed payload if working.
        """
        eoo = BaseEdxOAuth2(strategy=load_strategy())
        result = eoo.get_user_details({
            'id': 5,
            'username': 'darth',
            'email': 'darth@deathst.ar',
            'name': 'Darth Vader'
        })

        assert {
            'edx_id': 'darth',
            'username': 'darth',
            'fullname': 'Darth Vader',
            'email': 'darth@deathst.ar',
            'first_name': '',
            'last_name': ''
        } == result

    def test_single_name(self):
        """
        If the user only has one name, last_name should be blank.
        """
        eoo = BaseEdxOAuth2(strategy=load_strategy())
        result = eoo.get_user_details({
            'id': 5,
            'username': 'staff',
            'email': 'staff@example.com',
            'name': 'staff'
        })

        assert {
            'edx_id': 'staff',
            'username': 'staff',
            'fullname': 'staff',
            'email': 'staff@example.com',
            'first_name': '',
            'last_name': ''
        } == result
