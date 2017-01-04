"""
Tests for ecommerce views
"""
from unittest.mock import (
    MagicMock,
    patch,
    PropertyMock,
)

import ddt
from django.core.urlresolvers import reverse
from django.db.models.signals import post_save
from django.test import override_settings
from factory.django import mute_signals
import faker
import rest_framework.status as status

from backends.edxorg import EdxOrgOAuth2
from courses.factories import CourseRunFactory
from ecommerce.api import (
    create_unfulfilled_order,
    make_reference_id,
)
from ecommerce.api_test import create_purchasable_course_run
from ecommerce.factories import CouponFactory
from ecommerce.models import (
    Order,
    OrderAudit,
    Receipt,
    UserCoupon,
)
from ecommerce.serializers import CouponSerializer
from micromasters.factories import UserFactory
from profiles.api import get_social_username
from profiles.factories import ProfileFactory
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


@override_settings(
    CYBERSOURCE_REFERENCE_PREFIX=CYBERSOURCE_REFERENCE_PREFIX,
    ECOMMERCE_EMAIL='ecommerce@example.com'
)
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
        ) as enroll_user, patch(
            'ecommerce.views.MailgunClient.send_individual_email',
        ) as send_email:
            resp = self.client.post(reverse('order-fulfillment'), data=data)

        assert len(resp.content) == 0
        assert resp.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == Order.FULFILLED
        assert order.receipt_set.count() == 1
        assert order.receipt_set.first().data == data
        enroll_user.assert_called_with(order)

        assert send_email.call_count == 0

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
        If we fail to enroll in edX, the order status should be fulfilled but an error email should be sent
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
        ), patch(
            'ecommerce.views.MailgunClient.send_individual_email',
        ) as send_email:
            self.client.post(reverse('order-fulfillment'), data=data)

        assert Order.objects.count() == 1
        # An enrollment failure should not prevent the order from being fulfilled
        order = Order.objects.first()
        assert order.status == Order.FULFILLED

        assert send_email.call_count == 1
        assert send_email.call_args[0][0] == 'Error occurred when enrolling user during order fulfillment'
        assert send_email.call_args[0][1].startswith(
            'Error occurred when enrolling user during order fulfillment for {order}. '
            'Exception: '.format(
                order=order,
            )
        )
        assert send_email.call_args[0][2] == 'ecommerce@example.com'

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
        with patch(
            'ecommerce.views.IsSignedByCyberSource.has_permission',
            return_value=True
        ), patch(
            'ecommerce.views.MailgunClient.send_individual_email',
        ) as send_email:
            resp = self.client.post(reverse('order-fulfillment'), data=data)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.content) == 0
        order.refresh_from_db()
        assert Order.objects.count() == 1
        assert order.status == Order.FAILED

        assert send_email.call_count == 1
        assert send_email.call_args[0] == (
            'Order fulfillment failed, decision={decision}'.format(decision='something else'),
            'Order fulfillment failed for order {order}'.format(order=order),
            'ecommerce@example.com',
        )

    def test_no_permission(self):
        """
        If the permission class didn't give permission we shouldn't get access to the POST
        """
        with patch('ecommerce.views.IsSignedByCyberSource.has_permission', return_value=False):
            resp = self.client.post(reverse('order-fulfillment'), data={})
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@ddt.ddt
class CouponTests(ESTestCase):
    """
    Tests for list coupon view
    """

    @classmethod
    def setUpTestData(cls):
        """
        Create user, run, and coupons for testing
        """
        super().setUpTestData()
        with mute_signals(post_save):
            profile = ProfileFactory.create()
        cls.user = profile.user
        cls.user.social_auth.create(
            provider='not_edx',
        )
        cls.social_username = "{}_edx".format(cls.user.username)
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid='user',
        )
        run = CourseRunFactory.create()
        cls.coupon = CouponFactory.create(content_object=run.course.program)
        UserCoupon.objects.create(coupon=cls.coupon, user=cls.user)

    def setUp(self):
        super().setUp()
        self.client.force_login(self.user)

    @ddt.data(
        # In the code this is basically is_redeemable and (is_automatic or user_coupon_exists)
        [True, True, True, True],
        [True, True, False, True],
        [True, False, True, True],
        [True, False, False, False],
        [False, True, True, False],
        [False, True, False, False],
        [False, False, True, False],
        [False, False, False, False],
    )
    @ddt.unpack
    def test_list_coupons(self, is_redeemable, is_automatic, user_coupon_exists, expected):
        """
        Test happy path and edge cases for
        """
        if not user_coupon_exists:
            UserCoupon.objects.filter(user=self.user).delete()
        with patch(
            'ecommerce.views.Coupon.is_automatic', new_callable=PropertyMock
        ) as _is_automatic_mock, patch(
            'ecommerce.views.is_coupon_redeemable', autospec=True
        ) as _is_redeemable_mock:
            _is_automatic_mock.return_value = is_automatic
            _is_redeemable_mock.return_value = is_redeemable
            resp = self.client.get(reverse('coupon-list'))

        assert resp.status_code == status.HTTP_200_OK
        coupons = resp.json()

        if expected:
            # Due to short circuiting some of these may not get called if expected is False
            assert _is_automatic_mock.call_count == 1
            _is_automatic_mock.assert_called_with()
            assert _is_redeemable_mock.call_count == 1
            _is_redeemable_mock.assert_called_with(self.coupon, self.user)
            assert len(coupons) == 1
            assert coupons[0] == CouponSerializer(self.coupon).data
        else:
            assert len(coupons) == 0

    def test_not_logged_in(self):
        """
        Anonymous users should not be able to view this API
        """
        self.client.logout()
        resp = self.client.get(reverse('coupon-list'))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_views_only_own_coupons(self):
        """
        We should not see a coupon for run2 in the output, since there's no UserCoupon for it.
        """
        # Make a coupon without a UserCoupon
        coupon = CouponFactory.create(content_object=self.coupon.content_object)

        # Verify that it doesn't exist in output
        with patch(
            'ecommerce.views.is_coupon_redeemable', autospec=True
        ) as _is_redeemable_mock:
            _is_redeemable_mock.return_value = True
            resp = self.client.get(reverse('coupon-list'))

        assert _is_redeemable_mock.call_count == 2
        _is_redeemable_mock.assert_any_call(self.coupon, self.user)
        _is_redeemable_mock.assert_any_call(coupon, self.user)
        assert resp.status_code == status.HTTP_200_OK
        coupons = resp.json()
        assert len(coupons) == 1
        assert coupons[0] == CouponSerializer(self.coupon).data

    @ddt.data(True, False)
    def test_create_user_coupon(self, already_exists):
        """
        Test happy case for creating a UserCoupon
        """
        if not already_exists:
            # Won't change anything if it already exists
            UserCoupon.objects.all().delete()
        data = {
            'username': get_social_username(self.user),
        }
        with patch(
            'ecommerce.views.is_coupon_redeemable', autospec=True
        ) as _is_redeemable_mock:
            _is_redeemable_mock.return_value = True
            resp = self.client.post(
                reverse('coupon-user-create', kwargs={'code': self.coupon.coupon_code}),
                data=data,
                format='json',
            )
        _is_redeemable_mock.assert_called_with(self.coupon, self.user)
        assert resp.status_code == status.HTTP_200_OK
        assert UserCoupon.objects.count() == 1
        assert UserCoupon.objects.filter(user=self.user, coupon=self.coupon).exists()

    def test_empty_dict(self):
        """
        A 403 should be returned if an invalid dict is submitted
        """
        resp = self.client.post(reverse('coupon-user-create'), data={}, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN
