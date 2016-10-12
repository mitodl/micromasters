"""
Exceptions for financialaid.
"""


class NotSupportedException(Exception):
    """
    Not supported by current financial aid system.
    """


class ExceededAPICallsException(Exception):
    """
    Exceeded maximum number of API calls per month to Open Exchange Rates (openexchangerates.org)
    """


class UnexpectedAPIErrorException(Exception):
    """
    Unexpected error in making an API call
    """
