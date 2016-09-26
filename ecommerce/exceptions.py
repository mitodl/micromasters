"""
Exceptions for ecommerce
"""


class EcommerceException(Exception):
    """
    General exception regarding ecommerce
    """


class EcommerceEdxApiException(Exception):
    """
    Exception regarding edx_api_client
    """


class EcommerceModelException(Exception):
    """
    Exception regarding ecommerce models
    """


class ParseException(Exception):
    """
    Exception regarding parsing CyberSource reference numbers
    """
