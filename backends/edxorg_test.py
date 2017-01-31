"""
Oauth Backend Tests
"""
from unittest import TestCase
from .edxorg import EdxOrgOAuth2


class EdxOrgOAuth2Tests(TestCase):
    """Tests for EdxOrgOAuth2"""
    def test_response_parsing(self):
        """
        Should have properly formed payload if working.
        """
        eoo = EdxOrgOAuth2()
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
        eoo = EdxOrgOAuth2()
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
