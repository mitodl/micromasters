"""Views from ecommerce"""
import datetime
import logging

from django.conf import settings
from edx_api.client import EdxApi
import pytz
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from backends.edxorg import EdxOrgOAuth2
from dashboard.api import update_cached_enrollment
from ecommerce.api import (
    create_unfulfilled_order,
    generate_cybersource_sa_payload,
    get_new_order_by_reference_number,
)
from ecommerce.exceptions import EcommerceEdxApiException
from ecommerce.models import (
    Order,
    Receipt,
)
from ecommerce.permissions import IsSignedByCyberSource
from profiles.api import get_social_username

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

                user_social = request.user.social_auth.get(provider=EdxOrgOAuth2.name)
                enrollments_client = EdxApi(user_social.extra_data, settings.EDXORG_BASE_URL).enrollments

                exceptions = []
                enrollments = {}
                for line in order.line_set.all():
                    course_key = line.course_key
                    try:
                        enrollments[course_key] = enrollments_client.create_audit_student_enrollment(course_key)
                    except Exception as ex:
                        log.error(
                            "Error creating audit enrollment for course key %s for user %s",
                            course_key,
                            get_social_username(request.user),
                        )
                        exceptions.append(ex)

                now = datetime.datetime.now(pytz.UTC)
                for course_key, enrollment in enrollments.items():
                    update_cached_enrollment(order.user, enrollment, course_key, now)

                if len(exceptions) > 0:
                    raise EcommerceEdxApiException(exceptions)

            order.save()
        except:
            order.status = Order.FAILED
            order.save()
            raise

        # The response does not matter to CyberSource
        return Response()
