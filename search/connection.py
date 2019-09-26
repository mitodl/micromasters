"""Manages the Elasticsearch connection"""
import uuid

from django.conf import settings
from elasticsearch_dsl.connections import connections

from search.exceptions import ReindexException


_CONN = None
# When we create the connection, check to make sure all appropriate mappings exist
_CONN_VERIFIED = False

PUBLIC_ENROLLMENT_INDEX_TYPE = 'public_enrollment'
PRIVATE_ENROLLMENT_INDEX_TYPE = 'private_enrollment'
PERCOLATE_INDEX_TYPE = 'percolate'

GLOBAL_DOC_TYPE = '_doc'

ALL_INDEX_TYPES = [
    PUBLIC_ENROLLMENT_INDEX_TYPE,
    PRIVATE_ENROLLMENT_INDEX_TYPE,
    PERCOLATE_INDEX_TYPE,
]


def get_conn(*, verify=True, verify_indices=None):
    """
    Lazily create the connection.

    Args:
        verify (bool): If true, check the presence of indices and mappings
        verify_indices (list of str): If set, check the presence of these indices. Else use the defaults.

    Returns:
        elasticsearch.client.Elasticsearch: An Elasticsearch client
    """
    # pylint: disable=global-statement
    global _CONN
    global _CONN_VERIFIED

    do_verify = False
    if _CONN is None:
        http_auth = settings.ELASTICSEARCH_HTTP_AUTH
        use_ssl = http_auth is not None
        _CONN = connections.create_connection(
            hosts=[settings.ELASTICSEARCH_URL],
            http_auth=http_auth,
            use_ssl=use_ssl,
            # make sure we verify SSL certificates (off by default)
            verify_certs=use_ssl
        )
        # Verify connection on first connect if verify=True.
        do_verify = verify

    if verify and not _CONN_VERIFIED:
        # If we have a connection but haven't verified before, do it now.
        do_verify = True

    if not do_verify:
        if not verify:
            # We only skip verification if we're reindexing or
            # deleting the index. Make sure we verify next time we connect.
            _CONN_VERIFIED = False
        return _CONN

    # Make sure everything exists.
    if verify_indices is None:
        verify_indices = set()
        for index_type in ALL_INDEX_TYPES:
            verify_indices = verify_indices.union(
                get_aliases(index_type)
            )
    for verify_index in verify_indices:
        if not _CONN.indices.exists(verify_index):
            raise ReindexException("Unable to find index {index_name}".format(
                index_name=verify_index
            ))

    _CONN_VERIFIED = True
    return _CONN


def make_backing_index_name():
    """
    Make a unique name for use for a backing index

    Returns:
        str: A new name for a backing index
    """
    return "{prefix}_{hash}".format(
        prefix=settings.ELASTICSEARCH_INDEX,
        hash=uuid.uuid4().hex,
    )


def make_alias_name(index_type, *, is_reindexing):
    """
    Make the name used for the Elasticsearch alias

    Args:
        index_type (str): The type of index
        is_reindexing (bool): If true, use the alias name meant for reindexing

    Returns:
        str: The name of the alias
    """
    return "{prefix}_{index_type}_{suffix}".format(
        prefix=settings.ELASTICSEARCH_INDEX,
        index_type=index_type,
        suffix='reindexing' if is_reindexing else 'default'
    )


def get_aliases(index_type):
    """
    Return a list of active aliases

    There is always one item in the returned list and the first is always the default alias.

    Args:
        index_type (str): The index type

    Returns:
        list of str:
            A list of aliases.
            The list will always have at least one tuple, and the first is always the default alias
    """
    conn = get_conn(verify=False)

    default_alias = make_alias_name(index_type, is_reindexing=False)
    reindexing_alias = make_alias_name(index_type, is_reindexing=True)

    aliases = [default_alias]
    if conn.indices.exists(reindexing_alias):
        aliases.append(reindexing_alias)
    return aliases


def get_default_alias(index_type):
    """
    Return the default alias

    Args:
        index_type (str): The index type

    Returns:
        str: The default alias
    """
    return get_aliases(index_type)[0]
