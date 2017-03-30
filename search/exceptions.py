"""
Exceptions related to search
"""


class ReindexException(Exception):
    """
    Exception raised when a user needs to reindex Elasticsearch
    """


class NoProgramAccessException(Exception):
    """
    Exception raised when a user executing a search doesn't have permissions
     for any Programs.
    """


class PercolateException(Exception):
    """
    Exception for percolate failures
    """
