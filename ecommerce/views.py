"""Views from ecommerce"""
import logging
from urllib.parse import urljoin

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from courses.models import CourseRun
from ecommerce.api import (
    create_unfulfilled_order,
    enroll_user_on_success,
    generate_cybersource_sa_payload,
    get_new_order_by_reference_number,
)
from ecommerce.models import (
    Order,
    Receipt,
)
from ecommerce.permissions import IsSignedByCyberSource

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

    def post(self, request, *args, **kwargs):
        """
        If the course run is part of a financial aid program, create a new unfulfilled Order
        and return information used to submit to CyberSource.

        If the program does not have financial aid, this will return a URL to let the user
        pay for the course on edX.
        """
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
            dashboard_url = request.build_absolute_uri('/dashboard/')
            payload = generate_cybersource_sa_payload(order, dashboard_url)
            url = settings.CYBERSOURCE_SECURE_ACCEPTANCE_URL
            method = 'POST'
        else:
            payload = {}
            url = urljoin(settings.EDXORG_BASE_URL, '/course_modes/choose/{}/'.format(course_id))
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

    def post(self, request, *args, **kwargs):
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

        try:
            if request.data['decision'] != 'ACCEPT':
                # This may happen if the user clicks 'Cancel Order'
                order.status = Order.FAILED
            else:
                # Do the verified enrollment with edX here
                order.status = Order.FULFILLED
                enroll_user_on_success(order)
            order.save_and_log(None)
        except:
            order.status = Order.FAILED
            order.save_and_log(None)
            raise

        # The response does not matter to CyberSource
        return Response()
