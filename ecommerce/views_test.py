"""
Tests for ecommerce views
"""
from mock import (
    MagicMock,
    patch,
)

from django.core.urlresolvers import reverse
from django.test import override_settings
import rest_framework.status as status

from profiles.factories import UserFactory
from search.base import ESTestCase


CYBERSOURCE_SECURE_ACCEPTANCE_URL = 'http://fake'


class CheckoutViewTests(ESTestCase):
    """
    Tests for /api/v0/checkout/
    """

    def test_authenticated(self):
        """
        Unauthenticated users can't use this API
        """
        resp = self.client.post(reverse('checkout'), {}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_valid_course_id(self):
        """
        If course_id is not present in payload a ValidationError is raised
        """
        user = UserFactory.create()
        self.client.force_login(user)
        resp = self.client.post(reverse('checkout'), {}, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.json() == ['Missing course_id']

    @override_settings(CYBERSOURCE_SECURE_ACCEPTANCE_URL=CYBERSOURCE_SECURE_ACCEPTANCE_URL)
    def test_creates_order(self):
        """
        An order is created using create_unfulfilled_order and a payload
        is generated using generate_cybersource_sa_payload
        """
        course_key = 'course_key'

        user = UserFactory.create()
        self.client.force_login(user)
        order = MagicMock()
        payload = {
            'a': 'payload'
        }
        with patch(
            'ecommerce.views.create_unfulfilled_order',
            autospec=True,
            return_value=order,
        ) as create_mock, patch(
            'ecommerce.views.generate_cybersource_sa_payload',
            autospec=True,
            return_value=payload,
        ) as generate_mock:
            resp = self.client.post(reverse('checkout'), {'course_id': course_key}, format='json')

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            'payload': payload,
            'url': CYBERSOURCE_SECURE_ACCEPTANCE_URL,
        }

        assert create_mock.call_count == 1
        assert create_mock.call_args[0] == (course_key, user)
        assert generate_mock.call_count == 1
        assert generate_mock.call_args[0] == (order, )
