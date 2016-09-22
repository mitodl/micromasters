"""Views from ecommerce"""
import logging

from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from ecommerce.api import (
    create_unfulfilled_order,
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
    authentication_classes = (SessionAuthentication, )
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        """
        Creates a new unfulfilled Order and returns information used to submit to CyberSource
        """
        try:
            course_id = request.data['course_id']
        except KeyError:
            raise ValidationError("Missing course_id")

        order = create_unfulfilled_order(course_id, request.user)
        dashboard_url = request.build_absolute_uri('/dashboard/')
        payload = generate_cybersource_sa_payload(order, dashboard_url)

        return Response({
            'payload': payload,
            'url': settings.CYBERSOURCE_SECURE_ACCEPTANCE_URL,
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
            order.save()
        except:
            order.status = Order.FAILED
            order.save()
            raise

        # The response does not matter to CyberSource
        return Response()
