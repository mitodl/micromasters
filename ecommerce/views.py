"""Views from ecommerce"""
import logging
import traceback
from urllib.parse import urljoin, quote

from django.conf import settings
from django.db import transaction
from django.http.response import Http404
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.base import RedirectView
from ipware import get_client_ip
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.mixins import ListModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from courses.models import CourseRun
from backends.constants import BACKEND_MITX_ONLINE
from ecommerce.api import (
    create_unfulfilled_order,
    enroll_user_on_success,
    generate_cybersource_sa_payload,
    get_new_order_by_reference_number,
    is_coupon_redeemable,
    make_dashboard_receipt_url,
    pick_coupons,
)
from ecommerce.constants import (
    CYBERSOURCE_DECISION_ACCEPT,
    CYBERSOURCE_DECISION_CANCEL,
    MITXONLINE_CART_URL
)
from ecommerce.exceptions import EcommerceException
from ecommerce.models import (
    Coupon,
    Order,
    Receipt,
    UserCoupon,
)
from ecommerce.permissions import (
    IsLoggedInUser,
    IsSignedByCyberSource,
)
from ecommerce.serializers import CouponSerializer
from mail.api import MailgunClient
from ui.url_utils import DASHBOARD_URL, PAYMENT_CALL_BACK_URL

log = logging.getLogger(__name__)


class CheckoutView(APIView):
    """
    View for checkout API. This creates an Order in our system and provides a dictionary to
    send to Cybersource
    """
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        If the course run is part of a financial aid program, create a new unfulfilled Order
        and return information used to submit to CyberSource.

        If the program does not have financial aid, this will return a URL to let the user
        pay for the course on edX.
        """
        user_ip, _ = get_client_ip(request)
        try:
            course_id = request.data['course_id']
        except KeyError:
            raise ValidationError("Missing course_id")

        course_run = get_object_or_404(
            CourseRun,
            course__program__live=True,
            edx_course_key=course_id,
        )

        if course_run.course.program.financial_aid_availability:
            order = create_unfulfilled_order(course_id, request.user)
            payment_callback_url = request.build_absolute_uri(PAYMENT_CALL_BACK_URL)
            if order.total_price_paid == 0:
                # If price is $0, don't bother going to CyberSource, just mark as fulfilled
                order.status = Order.FULFILLED
                order.save_and_log(request.user)
                try:
                    enroll_user_on_success(order)
                except:  # pylint: disable=bare-except
                    log.exception(
                        "Error occurred when enrolling user in one or more courses for order %s. "
                        "See other errors above for more info.",
                        order
                    )
                    try:
                        MailgunClient().send_individual_email(
                            "Error occurred when enrolling user during $0 checkout",
                            "Error occurred when enrolling user during $0 checkout for {order}. "
                            "Exception: {exception}".format(
                                order=order,
                                exception=traceback.format_exc()
                            ),
                            settings.ECOMMERCE_EMAIL,
                        )
                    except:  # pylint: disable=bare-except
                        log.exception(
                            "Error occurred when sending the email to notify support "
                            "of user enrollment error during order %s $0 checkout",
                            order,
                        )

                # This redirects the user to our order success page
                payload = {}
                url = make_dashboard_receipt_url(payment_callback_url, course_id, 'receipt')
                method = 'GET'
            else:
                # This generates a signed payload which is submitted as an HTML form to CyberSource
                payload = generate_cybersource_sa_payload(order, payment_callback_url, user_ip)
                url = settings.CYBERSOURCE_SECURE_ACCEPTANCE_URL
                method = 'POST'

        elif course_run.courseware_backend == BACKEND_MITX_ONLINE:
            # Redirect the user to MITxOnline Cart page
            payload = {}
            url = urljoin(MITXONLINE_CART_URL, 'add/?course_id={}'.format(quote(course_id)))
            method = 'GET'

        else:
            # This redirects the user to edX to purchase the course there
            payload = {}
            url = urljoin(settings.EDXORG_CALLBACK_URL, '/course_modes/choose/{}/'.format(course_id))
            method = 'GET'

        return Response({
            'payload': payload,
            'url': url,
            'method': method,
        })


class OrderFulfillmentView(APIView):
    """
    View for order fulfillment API. This API is special in that only CyberSource should talk to it.
    Instead of authenticating with OAuth or via session this looks at the signature of the message
    to verify authenticity.
    """

    authentication_classes = ()
    permission_classes = (IsSignedByCyberSource, )

    def post(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Confirmation from CyberSource which fulfills an existing Order.
        """
        # First, save this information in a receipt
        receipt = Receipt.objects.create(data=request.data)

        # Link the order with the receipt if we can parse it
        reference_number = request.data['req_reference_number']
        order = get_new_order_by_reference_number(reference_number)
        receipt.order = order
        receipt.save()

        decision = request.data['decision']
        if order.status == Order.FAILED and decision == CYBERSOURCE_DECISION_CANCEL:
            # This is a duplicate message, ignore since it's already handled
            return Response(status=HTTP_200_OK)
        elif order.status != Order.CREATED:
            raise EcommerceException("Order {} is expected to have status 'created'".format(order.id))

        if decision != CYBERSOURCE_DECISION_ACCEPT:
            order.status = Order.FAILED
            log.warning(
                "Order fulfillment failed: received a decision that wasn't ACCEPT for order %s",
                order,
            )
            if decision != CYBERSOURCE_DECISION_CANCEL:
                try:
                    MailgunClient().send_individual_email(
                        "Order fulfillment failed, decision={decision}".format(
                            decision=decision
                        ),
                        "Order fulfillment failed for order {order}".format(
                            order=order,
                        ),
                        settings.ECOMMERCE_EMAIL
                    )
                except:  # pylint: disable=bare-except
                    log.exception(
                        "Error occurred when sending the email to notify "
                        "about order fulfillment failure for order %s",
                        order,
                    )
        else:
            order.status = Order.FULFILLED
        order.save_and_log(None)

        if order.status == Order.FULFILLED:
            try:
                enroll_user_on_success(order)
            except:  # pylint: disable=bare-except
                log.exception(
                    "Error occurred when enrolling user in one or more courses for order %s. "
                    "See other errors above for more info.",
                    order
                )
                try:
                    MailgunClient().send_individual_email(
                        "Error occurred when enrolling user during order fulfillment",
                        "Error occurred when enrolling user during order fulfillment for {order}. "
                        "Exception: {exception}".format(
                            order=order,
                            exception=traceback.format_exc()
                        ),
                        settings.ECOMMERCE_EMAIL,
                    )
                except:  # pylint: disable=bare-except
                    log.exception(
                        "Error occurred when sending the email to notify support "
                        "of user enrollment error during order %s fulfillment",
                        order,
                    )
        # The response does not matter to CyberSource
        return Response(status=HTTP_200_OK)


class CouponsView(ListModelMixin, GenericViewSet):
    """
    View for coupons API. This is a read-only API showing the user
    - what coupons they have available if those coupons would be automatically applied on checkout
    - what coupons they have for a given coupon code, even if those coupons wouldn't be automatically applied
    """
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )
    permission_classes = (IsAuthenticated,)
    serializer_class = CouponSerializer

    def get_queryset(self):
        """List coupons which a user is allowed to see"""
        return pick_coupons(self.request.user)


class UserCouponsView(APIView):
    """
    View for coupon/user attachments. Used to create attachments for a user for a coupon.
    """
    permission_classes = (IsLoggedInUser, IsAuthenticated,)
    authentication_classes = (
        SessionAuthentication,
        TokenAuthentication,
    )

    def post(self, request, code, *args, **kwargs):  # pylint: disable=unused-argument
        """Attach a coupon to a user"""
        with transaction.atomic():
            coupon = get_object_or_404(Coupon, coupon_code=code)
            if not is_coupon_redeemable(coupon, self.request.user):
                # Coupon is not redeemable. Return a 404 to prevent the user from
                raise Http404

            try:
                user_coupon = UserCoupon.objects.get(
                    coupon=coupon,
                    user=self.request.user,
                )
            except UserCoupon.DoesNotExist:
                user_coupon = UserCoupon(
                    coupon=coupon,
                    user=self.request.user,
                )

            # Note: we always want to save so that the modification date is updated
            user_coupon.save_and_log(request.user)

            return Response(
                status=HTTP_200_OK,
                data={
                    'message': 'Attached user to coupon successfully.',
                    'coupon': CouponSerializer(coupon).data,
                }
            )


@method_decorator(csrf_exempt, name='dispatch')
class PaymentCallBackView(RedirectView):
    """
    payment callback view that will redirect to dashboard url
    """
    url = DASHBOARD_URL
    query_string = True
