"""
Permission classes for ecommerce
"""
from rest_framework.permissions import BasePermission

from ecommerce.api import generate_cybersource_sa_signature


class IsSignedByCyberSource(BasePermission):
    """
    Confirms that the message is signed by CyberSource
    """

    def has_permission(self, request, view):
        """
        Returns true if request params are signed by CyberSource
        """
        signature = generate_cybersource_sa_signature(request.data)
        return request.data['signature'] == signature
