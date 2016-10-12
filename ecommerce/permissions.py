"""
Permission classes for ecommerce
"""
import logging

from rest_framework.permissions import BasePermission

from ecommerce.api import generate_cybersource_sa_signature


log = logging.getLogger(__name__)


class IsSignedByCyberSource(BasePermission):
    """
    Confirms that the message is signed by CyberSource
    """

    def has_permission(self, request, view):
        """
        Returns true if request params are signed by CyberSource
        """
        signature = generate_cybersource_sa_signature(request.data)
        if request.data['signature'] == signature:
            return True
        else:
            log.error(
                "Cybersource signature failed: we expected %s but we got %s. Payload: %s",
                signature,
                request.data['signature'],
                request.data,
            )
            return False
