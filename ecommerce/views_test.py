"""
Tests for ecommerce views
"""
from mock import (
    MagicMock,
    patch,
)

from django.core.urlresolvers import reverse
from django.test import override_settings
import faker
import rest_framework.status as status

from ecommerce.api import (
    create_unfulfilled_order,
    make_reference_id,
)
from ecommerce.api_test import create_purchasable_course_run
from ecommerce.models import (
    Order,
    Receipt,
)
from profiles.factories import UserFactory
from search.base import ESTestCase


CYBERSOURCE_SECURE_ACCEPTANCE_URL = 'http://fake'
CYBERSOURCE_REFERENCE_PREFIX = 'fake'
FAKE = faker.Factory.create()


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


@override_settings(CYBERSOURCE_REFERENCE_PREFIX=CYBERSOURCE_REFERENCE_PREFIX)
class OrderFulfillmentViewTests(ESTestCase):
    """
    Tests for order fulfillment
    """
    def test_order_fulfilled(self):
        """
        Test the happy case
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)

        data = {}
        for _ in range(5):
            data[FAKE.text()] = FAKE.text()

        data['req_reference_number'] = make_reference_id(order)
        data['decision'] = 'ACCEPT'

        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=True):
            resp = self.client.post(reverse('order-fulfillment'), data=data)

        assert len(resp.content) == 0
        assert resp.status_code == status.HTTP_200_OK
        order.refresh_from_db()

        assert order.status == Order.FULFILLED
        assert order.receipt_set.count() == 1
        assert order.receipt_set.first().data == data

    def test_missing_fields(self):
        """
        If CyberSource POSTs with fields missing, we should at least save it in a receipt
        """
        data = {}
        for _ in range(5):
            data[FAKE.text()] = FAKE.text()
        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=True):
            try:
                self.client.post(reverse('order-fulfillment'), data=data)
            except KeyError:
                pass

        assert Order.objects.count() == 0
        assert Receipt.objects.count() == 1
        assert Receipt.objects.first().data == data

    def test_not_accept(self):
        """
        If the decision is not ACCEPT then the order should be marked as failed
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)

        data = {
            'req_reference_number': make_reference_id(order),
            'decision': 'something else',
        }
        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=True):
            resp = self.client.post(reverse('order-fulfillment'), data=data)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.content) == 0
        order.refresh_from_db()
        assert Order.objects.count() == 1
        assert order.status == Order.FAILED

    def test_no_permission(self):
        """
        If the permission class didn't give permission we shouldn't get access to the POST
        """
        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=False):
            resp = self.client.post(reverse('order-fulfillment'), data={})
        assert resp.status_code == status.HTTP_403_FORBIDDEN
