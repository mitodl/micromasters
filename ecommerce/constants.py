"""Ecommerce constants"""
from urllib.parse import urljoin
from django.conf import settings

# From secure acceptance documentation, under API reply fields:
# http://apps.cybersource.com/library/documentation/dev_guides/Secure_Acceptance_SOP/Secure_Acceptance_SOP.pdf
CYBERSOURCE_DECISION_ACCEPT = 'ACCEPT'
CYBERSOURCE_DECISION_DECLINE = 'DECLINE'
CYBERSOURCE_DECISION_REVIEW = 'REVIEW'
CYBERSOURCE_DECISION_ERROR = 'ERROR'
CYBERSOURCE_DECISION_CANCEL = 'CANCEL'

REFERENCE_NUMBER_PREFIX = 'MM-'

MITXONLINE_CART_URL = urljoin(settings.MITXONLINE_URL, "/cart/")
