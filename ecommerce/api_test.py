"""
Test for ecommerce functions
"""
from base64 import b64encode
from datetime import datetime
import hashlib
import hmac
from unittest.mock import (
    MagicMock,
    patch,
    PropertyMock,
)
from urllib.parse import quote_plus

from django.core.exceptions import ImproperlyConfigured
from django.http.response import Http404
from django.test import override_settings
import pytz
from rest_framework.exceptions import ValidationError
from edx_api.enrollments import Enrollment

from backends.pipeline_api import EdxOrgOAuth2
from courses.factories import CourseRunFactory
from dashboard.models import (
    CachedCertificate,
    CachedEnrollment,
    ProgramEnrollment,
)
from ecommerce.api import (
    create_unfulfilled_order,
    enroll_user_on_success,
    generate_cybersource_sa_payload,
    generate_cybersource_sa_signature,
    get_purchasable_course_run,
    get_new_order_by_reference_number,
    is_coupon_redeemable,
    is_coupon_redeemable_for_run,
    ISO_8601_FORMAT,
    make_reference_id,
)
from ecommerce.exceptions import (
    EcommerceEdxApiException,
    EcommerceException,
    ParseException,
)
from ecommerce.factories import (
    CouponFactory,
    CoursePriceFactory,
    LineFactory,
    OrderFactory,
)
from ecommerce.models import (
    Coupon,
    Order,
    OrderAudit,
)
from financialaid.factories import FinancialAidFactory
from financialaid.models import FinancialAidStatus
from micromasters.factories import UserFactory
from search.base import ESTestCase


# pylint: disable=no-self-use
def create_purchasable_course_run():
    """
    Creates a purchasable course run and an associated user
    """
    course_run = CourseRunFactory.create(
        course__program__live=True,
        course__program__financial_aid_availability=True,
    )
    price = CoursePriceFactory.create(course_run=course_run, is_valid=True)
    user = UserFactory.create()
    FinancialAidFactory.create(
        tier_program__current=True,
        tier_program__program=course_run.course.program,
        tier_program__discount_amount=price.price/2,
        user=user,
        status=FinancialAidStatus.APPROVED,
    )
    ProgramEnrollment.objects.create(user=user, program=course_run.course.program)
    return course_run, user


class PurchasableTests(ESTestCase):
    """
    Tests for get_purchasable_courses and create_unfulfilled_order
    """

    def test_success(self):
        """
        A course run which is live, has financial aid,
        has a price, and was not already purchased, should be purchasable
        """
        course_run, user = create_purchasable_course_run()
        assert get_purchasable_course_run(course_run.edx_course_key, user) == course_run

    def test_not_live(self):
        """
        Purchasable course runs must be live
        """
        course_run, user = create_purchasable_course_run()
        program = course_run.course.program
        program.live = False
        program.save()

        with self.assertRaises(Http404):
            get_purchasable_course_run(course_run.edx_course_key, user)

    def test_no_current_financial_aid(self):
        """
        Purchasable course runs must have financial aid available
        """
        course_run, user = create_purchasable_course_run()
        program = course_run.course.program
        tier_program = program.tier_programs.first()
        tier_program.current = False
        tier_program.save()

        with self.assertRaises(ValidationError) as ex:
            get_purchasable_course_run(course_run.edx_course_key, user)
        assert ex.exception.args[0] == (
            "Course run {} does not have a current attached financial aid application".format(
                course_run.edx_course_key
            )
        )

    def test_financial_aid_for_user(self):
        """
        Purchasable course runs must have a financial aid attached for the given user
        """
        course_run, user = create_purchasable_course_run()
        program = course_run.course.program
        tier_program = program.tier_programs.first()
        financial_aid = tier_program.financialaid_set.first()
        financial_aid.user = UserFactory.create()
        financial_aid.save()

        with self.assertRaises(ValidationError) as ex:
            get_purchasable_course_run(course_run.edx_course_key, user)
        assert ex.exception.args[0] == (
            "Course run {} does not have a current attached financial aid application".format(
                course_run.edx_course_key
            )
        )

    def test_financial_aid_terminal_status(self):
        """
        FinancialAid must have a status which allows purchase to happen
        """
        course_run, user = create_purchasable_course_run()
        program = course_run.course.program
        tier_program = program.tier_programs.first()
        financial_aid = tier_program.financialaid_set.first()
        for status in set(FinancialAidStatus.ALL_STATUSES).difference(set(FinancialAidStatus.TERMINAL_STATUSES)):
            financial_aid.status = status
            financial_aid.save()

            with self.assertRaises(ValidationError) as ex:
                get_purchasable_course_run(course_run.edx_course_key, user)
            assert ex.exception.args[0] == (
                "Course run {} does not have a current attached financial aid application".format(
                    course_run.edx_course_key
                )
            )

    def test_financial_aid_not_available(self):
        """
        Purchasable course runs must have financial aid available
        """
        course_run, user = create_purchasable_course_run()
        program = course_run.course.program
        program.financial_aid_availability = False
        program.save()

        with self.assertRaises(Http404):
            get_purchasable_course_run(course_run.edx_course_key, user)

    def test_no_valid_price(self):
        """
        Purchasable course runs must have a valid price
        """
        course_run, user = create_purchasable_course_run()
        course_price = course_run.courseprice_set.get(is_valid=True)
        course_price.is_valid = False
        course_price.save()

        with self.assertRaises(Http404):
            get_purchasable_course_run(course_run.edx_course_key, user)

    def test_no_program_enrollment(self):
        """
        For a user to purchase a course run they must already be enrolled in the program
        """
        course_run, user = create_purchasable_course_run()
        ProgramEnrollment.objects.filter(program=course_run.course.program, user=user).delete()
        try:
            create_unfulfilled_order(course_run.edx_course_key, user)
        except Http404:
            pass

    def test_already_purchased(self):
        """
        Purchasable course runs must not be already purchased
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)

        # succeeds because order is unfulfilled
        assert course_run == get_purchasable_course_run(course_run.edx_course_key, user)

        order.status = Order.FULFILLED
        order.save()
        with self.assertRaises(ValidationError) as ex:
            get_purchasable_course_run(course_run.edx_course_key, user)

        assert ex.exception.args[0] == 'Course run {} is already purchased'.format(course_run.edx_course_key)

    def test_less_or_equal_to_zero(self):
        """
        An order may not have a negative or zero price
        """
        course_run, user = create_purchasable_course_run()
        price_obj = course_run.courseprice_set.get(is_valid=True)

        for invalid_price in (0, -1.23,):
            price_obj.price = invalid_price
            price_obj.save()

            with patch('ecommerce.api.get_purchasable_course_run', autospec=True, return_value=course_run) as mocked:
                with self.assertRaises(ImproperlyConfigured) as ex:
                    create_unfulfilled_order(course_run.edx_course_key, user)
                assert ex.exception.args[0] == "Price to be charged is less than or equal to zero"
            assert mocked.call_count == 1
            assert mocked.call_args[0] == (course_run.edx_course_key, user)

            assert Order.objects.count() == 0

    def test_create_order(self):
        """
        Create Order from a purchasable course
        """
        course_run, user = create_purchasable_course_run()
        discounted_price = round(course_run.courseprice_set.get(is_valid=True).price/2, 2)
        price_dict = {
            "price": discounted_price
        }

        with patch(
            'ecommerce.api.get_purchasable_course_run',
            autospec=True,
            return_value=course_run,
        ) as get_purchasable, patch(
            'ecommerce.api.get_formatted_course_price',
            autospec=True,
            return_value=price_dict,
        ) as get_price:
            order = create_unfulfilled_order(course_run.edx_course_key, user)
        assert get_purchasable.call_count == 1
        assert get_purchasable.call_args[0] == (course_run.edx_course_key, user)
        assert get_price.call_count == 1
        assert get_price.call_args[0] == (
            ProgramEnrollment.objects.get(user=user, program=course_run.course.program),
        )

        assert Order.objects.count() == 1
        assert order.status == Order.CREATED
        assert order.total_price_paid == discounted_price
        assert order.user == user

        assert order.line_set.count() == 1
        line = order.line_set.first()
        assert line.course_key == course_run.edx_course_key
        assert line.description == 'Seat for {}'.format(course_run.title)
        assert line.price == discounted_price

        assert OrderAudit.objects.count() == 1
        order_audit = OrderAudit.objects.first()
        assert order_audit.order == order
        assert order_audit.data_after == order.to_dict()

        # data_before only has modified_at different, since we only call save_and_log
        # after Order is already created
        data_before = order_audit.data_before
        dict_before = order.to_dict()
        del data_before['modified_at']
        del dict_before['modified_at']
        assert data_before == dict_before

CYBERSOURCE_ACCESS_KEY = 'access'
CYBERSOURCE_PROFILE_ID = 'profile'
CYBERSOURCE_SECURITY_KEY = 'security'
CYBERSOURCE_REFERENCE_PREFIX = 'prefix'


@override_settings(
    CYBERSOURCE_ACCESS_KEY=CYBERSOURCE_ACCESS_KEY,
    CYBERSOURCE_PROFILE_ID=CYBERSOURCE_PROFILE_ID,
    CYBERSOURCE_SECURITY_KEY=CYBERSOURCE_SECURITY_KEY,
)
class CybersourceTests(ESTestCase):
    """
    Tests for generate_cybersource_sa_payload and generate_cybersource_sa_signature
    """
    def test_valid_signature(self):
        """
        Signature is made up of a ordered key value list signed using HMAC 256 with a security key
        """
        payload = {
            'x': 'y',
            'abc': 'def',
            'key': 'value',
            'signed_field_names': 'abc,x',
        }
        signature = generate_cybersource_sa_signature(payload)

        message = ','.join('{}={}'.format(key, payload[key]) for key in ['abc', 'x'])

        digest = hmac.new(
            CYBERSOURCE_SECURITY_KEY.encode('utf-8'),
            msg=message.encode('utf-8'),
            digestmod=hashlib.sha256,
        ).digest()

        assert b64encode(digest).decode('utf-8') == signature

    def test_signed_payload(self):
        """
        A valid payload should be signed appropriately
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)
        username = 'username'
        transaction_uuid = 'hex'

        now = datetime.now(tz=pytz.UTC)
        now_mock = MagicMock(return_value=now)

        with patch('ecommerce.api.get_social_username', autospec=True, return_value=username):
            with patch('ecommerce.api.datetime', autospec=True, now=now_mock):
                with patch('ecommerce.api.uuid.uuid4', autospec=True, return_value=MagicMock(hex=transaction_uuid)):
                    payload = generate_cybersource_sa_payload(order, 'dashboard_url')
        signature = payload.pop('signature')
        assert generate_cybersource_sa_signature(payload) == signature
        signed_field_names = payload['signed_field_names'].split(',')
        assert signed_field_names == sorted(payload.keys())
        quoted_course_key = quote_plus(course_run.edx_course_key)

        assert payload == {
            'access_key': CYBERSOURCE_ACCESS_KEY,
            'amount': str(order.total_price_paid),
            'consumer_id': username,
            'currency': 'USD',
            'item_0_code': 'course',
            'item_0_name': '{}'.format(course_run.title),
            'item_0_quantity': 1,
            'item_0_sku': '{}'.format(course_run.edx_course_key),
            'item_0_tax_amount': '0',
            'item_0_unit_price': str(order.total_price_paid),
            'line_item_count': 1,
            'locale': 'en-us',
            'override_custom_cancel_page': 'dashboard_url?status=cancel&course_key={}'.format(quoted_course_key),
            'override_custom_receipt_page': "dashboard_url?status=receipt&course_key={}".format(quoted_course_key),
            'reference_number': make_reference_id(order),
            'profile_id': CYBERSOURCE_PROFILE_ID,
            'signed_date_time': now.strftime(ISO_8601_FORMAT),
            'signed_field_names': ','.join(signed_field_names),
            'transaction_type': 'sale',
            'transaction_uuid': transaction_uuid,
            'unsigned_field_names': '',
            'merchant_defined_data1': 'course',
            'merchant_defined_data2': '{}'.format(course_run.title),
            'merchant_defined_data3': '{}'.format(course_run.edx_course_key),
        }
        now_mock.assert_called_with(tz=pytz.UTC)


@override_settings(CYBERSOURCE_REFERENCE_PREFIX=CYBERSOURCE_REFERENCE_PREFIX)
class ReferenceNumberTests(ESTestCase):
    """
    Tests for get_order_by_reference_number and make_reference_id
    """

    def test_make_reference_id(self):
        """
        make_reference_id should concatenate the reference prefix and the order id
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)
        assert "MM-{}-{}".format(CYBERSOURCE_REFERENCE_PREFIX, order.id) == make_reference_id(order)

    def test_get_new_order_by_reference_number(self):
        """
        get_new_order_by_reference_number returns an Order with status created
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)
        same_order = get_new_order_by_reference_number(make_reference_id(order))
        assert same_order.id == order.id

    def test_parse(self):
        """
        Test parse errors are handled well
        """
        with self.assertRaises(ParseException) as ex:
            get_new_order_by_reference_number("XYZ-1-3")
        assert ex.exception.args[0] == "Reference number must start with MM-"

        with self.assertRaises(ParseException) as ex:
            get_new_order_by_reference_number("MM-no_dashes_here")
        assert ex.exception.args[0] == "Unable to find order number in reference number"

        with self.assertRaises(ParseException) as ex:
            get_new_order_by_reference_number("MM-something-NaN")
        assert ex.exception.args[0] == "Unable to parse order number"

        with self.assertRaises(ParseException) as ex:
            get_new_order_by_reference_number("MM-not_matching-3")
        assert ex.exception.args[0] == "CyberSource prefix doesn't match"

    def test_status(self):
        """
        get_order_by_reference_number should only get orders with status=CREATED
        """
        course_run, user = create_purchasable_course_run()
        order = create_unfulfilled_order(course_run.edx_course_key, user)

        for status in (status for status in Order.STATUSES if status != Order.CREATED):
            order.status = status
            order.save()

            with self.assertRaises(EcommerceException) as ex:
                get_new_order_by_reference_number(make_reference_id(order))
            assert ex.exception.args[0] == "Order {} is expected to have status 'created'".format(order.id)


class EnrollUserTests(ESTestCase):
    """
    Tests for enroll_user
    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.user = UserFactory()
        cls.user.social_auth.create(
            provider='not_edx',
        )
        cls.user.social_auth.create(
            provider=EdxOrgOAuth2.name,
            uid="{}_edx".format(cls.user.username),
        )
        cls.order = OrderFactory.create(status=Order.CREATED, user=cls.user)
        cls.line1 = LineFactory.create(order=cls.order)
        cls.line2 = LineFactory.create(order=cls.order)
        cls.course_run1 = CourseRunFactory.create(edx_course_key=cls.line1.course_key)
        CoursePriceFactory.create(course_run=cls.course_run1, is_valid=True)
        cls.course_run2 = CourseRunFactory.create(edx_course_key=cls.line2.course_key)
        CoursePriceFactory.create(course_run=cls.course_run2, is_valid=True)

    def test_enroll(self):
        """
        Test that an enrollment is made for each course key attached to the order
        and that the CachedEnrollments are produced.
        """
        def create_audit(course_key):
            """Helper function to create a fake enrollment"""
            return Enrollment({"course_details": {"course_id": course_key}})

        create_audit_mock = MagicMock(side_effect=create_audit)
        enrollments_mock = MagicMock(create_audit_student_enrollment=create_audit_mock)
        edx_api_mock = MagicMock(enrollments=enrollments_mock)
        with patch('ecommerce.api.EdxApi', return_value=edx_api_mock):
            enroll_user_on_success(self.order)

        assert len(create_audit_mock.call_args_list) == self.order.line_set.count()
        for i, line in enumerate(self.order.line_set.all()):
            assert create_audit_mock.call_args_list[i][0] == (line.course_key, )
        assert CachedEnrollment.objects.count() == self.order.line_set.count()

        for line in self.order.line_set.all():
            enrollment = CachedEnrollment.objects.get(
                user=self.order.user,
                course_run__edx_course_key=line.course_key,
            )
            assert enrollment.data == create_audit(line.course_key).json

    def test_failed(self):
        """
        Test that an exception is raised containing a list of exceptions of the failed enrollments
        """
        def create_audit(course_key):
            """Fail for first course key"""
            if course_key == self.line1.course_key:
                raise Exception("fatal error {}".format(course_key))
            return Enrollment({"course_details": {"course_id": course_key}})

        create_audit_mock = MagicMock(side_effect=create_audit)
        enrollments_mock = MagicMock(create_audit_student_enrollment=create_audit_mock)
        edx_api_mock = MagicMock(enrollments=enrollments_mock)
        with patch('ecommerce.api.EdxApi', return_value=edx_api_mock):
            with self.assertRaises(EcommerceEdxApiException) as ex:
                enroll_user_on_success(self.order)
            assert len(ex.exception.args[0]) == 1
            assert ex.exception.args[0][0].args[0] == 'fatal error {}'.format(self.line1.course_key)

        assert len(create_audit_mock.call_args_list) == self.order.line_set.count()
        for i, line in enumerate(self.order.line_set.all()):
            assert create_audit_mock.call_args_list[i][0] == (line.course_key, )

        assert CachedEnrollment.objects.count() == 1
        enrollment = CachedEnrollment.objects.get(
            user=self.order.user,
            course_run__edx_course_key=self.line2.course_key,
        )
        assert enrollment.data == create_audit(self.line2.course_key).json


class CouponTests(ESTestCase):
    """
    Tests for coupon-related API functions
    """

    @classmethod
    def setUpTestData(cls):
        """Create a set of course runs for testing"""
        super().setUpTestData()
        cls.run1 = CourseRunFactory.create(course__program__live=True)
        cls.program = cls.run1.course.program
        cls.run2 = CourseRunFactory.create(course=cls.run1.course)
        cls.runs = [cls.run1, cls.run2]
        cls.user = UserFactory.create()
        ProgramEnrollment.objects.create(user=cls.user, program=cls.run1.course.program)

    def setUp(self):
        super().setUp()
        for obj in [self.run1, self.run2, self.program, self.user]:
            obj.refresh_from_db()

    def test_is_coupon_redeemable_for_run(self):
        """Happy case for is_coupon_redeemable_for_run"""
        coupon = CouponFactory.create(content_object=self.run1)
        with patch('ecommerce.api.is_coupon_redeemable', autospec=True) as _is_coupon_redeemable:
            _is_coupon_redeemable.return_value = True
            assert is_coupon_redeemable_for_run(coupon, self.user, self.run1.edx_course_key) is True
        assert _is_coupon_redeemable.call_count == 1
        _is_coupon_redeemable.assert_called_with(coupon, self.user)

    def test_is_not_redeemable(self):
        """If is_coupon_redeemable returns False, is_coupon_redeemable_for_run should also return False"""
        coupon = CouponFactory.create(content_object=self.run1)
        with patch('ecommerce.api.is_coupon_redeemable', autospec=True) as _is_coupon_redeemable:
            _is_coupon_redeemable.return_value = False
            assert is_coupon_redeemable_for_run(coupon, self.user, self.run1.edx_course_key) is False
        assert _is_coupon_redeemable.call_count == 1
        _is_coupon_redeemable.assert_called_with(coupon, self.user)

    def test_course_key_not_in_list(self):
        """run is not in the course keys listed by Coupon"""
        coupon = CouponFactory.create(content_object=self.program)
        with patch('ecommerce.api.is_coupon_redeemable', autospec=True) as _is_coupon_redeemable, patch(
            'ecommerce.api.Coupon.course_keys', new_callable=PropertyMock
        ) as _course_keys:
            _is_coupon_redeemable.return_value = True
            _course_keys.return_value = ['missing']
            assert is_coupon_redeemable_for_run(coupon, self.user, self.run1.edx_course_key) is False
        assert _is_coupon_redeemable.call_count == 1
        _is_coupon_redeemable.assert_called_with(coupon, self.user)
        assert _course_keys.call_count == 1

    def test_standard(self):
        """
        A standard coupon should be redeemable if various conditions are met
        """
        coupon = CouponFactory.create(content_object=self.program)
        assert is_coupon_redeemable(coupon, self.user) is True

    def test_user_not_enrolled_in_program(self):
        """A coupon is not redeemable if the user is not enrolled in the same program as any coupon"""
        coupon = CouponFactory.create(content_object=self.program)
        user = UserFactory.create()
        assert is_coupon_redeemable(coupon, user) is False

    def test_user_not_enrolled_in_live_program(self):
        """A coupon is not redeemable if the coupon's program is not live"""
        coupon = CouponFactory.create(content_object=self.program)
        self.program.live = False
        self.program.save()
        assert is_coupon_redeemable(coupon, self.user) is False

    def test_is_not_valid(self):
        """If a Coupon is not valid it should not be redeemable"""
        coupon = CouponFactory.create(content_object=self.program)
        with patch('ecommerce.api.Coupon.is_valid', new_callable=PropertyMock) as is_valid:
            is_valid.return_value = False
            assert is_coupon_redeemable(coupon, self.user) is False

    def test_no_more_coupons(self):
        """If user has no redemptions left the coupon should not be redeemable"""
        coupon = CouponFactory.create(content_object=self.program)
        with patch('ecommerce.api.Coupon.user_has_redemptions_left', autospec=True) as _user_has_redemptions:
            _user_has_redemptions.return_value = False
            assert is_coupon_redeemable(coupon, self.user) is False
        assert _user_has_redemptions.call_count == 1
        _user_has_redemptions.assert_called_with(coupon, self.user)

    def test_prev_course(self):
        """
        A coupon for a previously purchased course should be redeemable if
        it applies to the course which is being purchased
        """
        coupon = CouponFactory.create(
            coupon_type=Coupon.DISCOUNTED_PREVIOUS_COURSE,
            content_object=self.run1.course,
        )
        cert_json = {
            "username": "staff",
            "course_id": self.run1.edx_course_key,
            "certificate_type": "verified",
            "status": "downloadable",
            "download_url": "http://www.example.com/demo.pdf",
            "grade": "0.98"
        }
        CachedCertificate.objects.create(
            user=self.user,
            course_run=self.run1,
            data=cert_json,
        )
        assert is_coupon_redeemable(coupon, self.user) is True

    def test_prev_course_user_not_verified(self):
        """If a user is not verified, they should not get a coupon for the course"""
        coupon = CouponFactory.create(
            coupon_type=Coupon.DISCOUNTED_PREVIOUS_COURSE,
            content_object=self.run1.course,
        )
        assert is_coupon_redeemable(coupon, self.user) is False
