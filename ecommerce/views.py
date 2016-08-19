"""Views from ecommerce"""
from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from ecommerce.api import (
    create_unfulfilled_order,
    generate_cybersource_sa_payload,
)


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
        payload = generate_cybersource_sa_payload(order)

        return Response({
            'payload': payload,
            'url': settings.CYBERSOURCE_SECURE_ACCEPTANCE_URL,
        })
