"""
Tests for ecommerce views
"""
from django.core.urlresolvers import reverse
from django.db.models.signals import post_save
from django.test import override_settings
from factory.django import mute_signals
import faker
from mock import (
    MagicMock,
    patch,
)
import rest_framework.status as status

from courses.factories import CourseRunFactory
from ecommerce.api import (
    create_unfulfilled_order,
    make_reference_id,
)
from ecommerce.api_test import create_purchasable_course_run
from ecommerce.models import (
    Order,
    OrderAudit,
    Receipt,
)
from profiles.factories import (
    ProfileFactory,
    UserFactory,
)
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

    def test_not_live_program(self):
        """
        An order is created using create_unfulfilled_order and a payload
        is generated using generate_cybersource_sa_payload
        """
        user = UserFactory.create()
        self.client.force_login(user)
        course_run = CourseRunFactory.create(
            course__program__live=False,
            course__program__financial_aid_availability=True,
        )

        resp = self.client.post(reverse('checkout'), {'course_id': course_run.edx_course_key}, format='json')
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_course(self):
        """
        A 404 should be returned if the course does not exist
        """
        user = UserFactory.create()
        self.client.force_login(user)
        resp = self.client.post(reverse('checkout'), {'course_id': 'missing'}, format='json')
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @override_settings(CYBERSOURCE_SECURE_ACCEPTANCE_URL=CYBERSOURCE_SECURE_ACCEPTANCE_URL)
    def test_creates_order(self):
        """
        An order is created using create_unfulfilled_order and a payload
        is generated using generate_cybersource_sa_payload
        """
        user = UserFactory.create()
        self.client.force_login(user)

        course_run = CourseRunFactory.create(
            course__program__live=True,
            course__program__financial_aid_availability=True,
        )
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
            resp = self.client.post(reverse('checkout'), {'course_id': course_run.edx_course_key}, format='json')

        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            'payload': payload,
            'url': CYBERSOURCE_SECURE_ACCEPTANCE_URL,
            'method': 'POST',
        }

        assert create_mock.call_count == 1
        assert create_mock.call_args[0] == (course_run.edx_course_key, user)
        assert generate_mock.call_count == 1
        assert generate_mock.call_args[0] == (order, 'http://testserver/dashboard/')

    @override_settings(EDXORG_BASE_URL='http://edx_base')
    def test_provides_edx_link(self):
        """If the program doesn't have financial aid, the checkout API should provide a link to go to edX"""
        user = UserFactory.create()
        self.client.force_login(user)

        course_run = CourseRunFactory.create(
            course__program__live=True,
            course__program__financial_aid_availability=False,
        )
        resp = self.client.post(reverse('checkout'), {'course_id': course_run.edx_course_key}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            'payload': {},
            'url': 'http://edx_base/course_modes/choose/{}/'.format(course_run.edx_course_key),
            'method': 'GET',
        }

        # We should only create Order objects for a Cybersource checkout
        assert Order.objects.count() == 0

    def test_post_redirects(self):
        """Test that POST redirects to same URL"""
        with mute_signals(post_save):
            profile = ProfileFactory.create(agreed_to_terms_of_service=True, filled_out=True)
        self.client.force_login(profile.user)
        resp = self.client.post("/dashboard/", follow=True)
        assert resp.redirect_chain == [('http://testserver/dashboard/', 302)]


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
        data_before = order.to_dict()

        data = {}
        for _ in range(5):
            data[FAKE.text()] = FAKE.text()

        data['req_reference_number'] = make_reference_id(order)
        data['decision'] = 'ACCEPT'

        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=True), patch(
            'ecommerce.views.enroll_user_on_success'
        ) as enroll_user:
            resp = self.client.post(reverse('order-fulfillment'), data=data)

        assert len(resp.content) == 0
        assert resp.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == Order.FULFILLED
        assert order.receipt_set.count() == 1
        assert order.receipt_set.first().data == data
        enroll_user.assert_called_with(order)

        assert OrderAudit.objects.count() == 2
        order_audit = OrderAudit.objects.last()
        assert order_audit.order == order
        assert order_audit.data_before == data_before
        assert order_audit.data_after == order.to_dict()

    def test_missing_fields(self):
        """
        If CyberSource POSTs with fields missing, we should at least save it in a receipt.
        It is very unlikely for Cybersource to POST invalid data but it also provides a way to test
        that we save a Receipt in the event of an error.
        """
        data = {}
        for _ in range(5):
            data[FAKE.text()] = FAKE.text()
        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=True):
            try:
                # Missing fields from Cybersource POST will cause the KeyError.
                # In this test we just care that we saved the data in Receipt for later
                # analysis.
                self.client.post(reverse('order-fulfillment'), data=data)
            except KeyError:
                pass

        assert Order.objects.count() == 0
        assert Receipt.objects.count() == 1
        assert Receipt.objects.first().data == data

    def test_failed_enroll(self):
        """
        If we fail to enroll in edX, the order status should be failed
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)

        data = {}
        for _ in range(5):
            data[FAKE.text()] = FAKE.text()

        data['req_reference_number'] = make_reference_id(order)
        data['decision'] = 'ACCEPT'

        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=True), patch(
            'ecommerce.views.enroll_user_on_success', side_effect=KeyError
        ):
            with self.assertRaises(KeyError):
                self.client.post(reverse('order-fulfillment'), data=data)

        assert Order.objects.count() == 1
        assert Order.objects.first().status == Order.FAILED

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
