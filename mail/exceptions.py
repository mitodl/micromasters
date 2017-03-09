"""Exceptions for mail"""


class SendBatchException(Exception):
    """
    An exception which occurs when batch processing of email fails. This contains a list of other exceptions and
    the emails which caused the failure.
    """

    def __init__(self, exception_pairs):
        """
        Creates a SendBatchException

        Args:
            exception_pairs (list): A list of (list of recipients, exception)
        """
        super().__init__(exception_pairs)
        self.exception_pairs = exception_pairs
