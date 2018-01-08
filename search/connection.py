"""Manages the Elasticsearch connection"""
import uuid

from django.conf import settings
from elasticsearch_dsl.connections import connections

from search.exceptions import ReindexException


_CONN = None
# When we create the connection, check to make sure all appropriate mappings exist
_CONN_VERIFIED = False

# This is a builtin type in Elasticsearch 2
LEGACY_PERCOLATE_DOC_TYPE = '.percolator'

LEGACY_USER_DOC_TYPE = 'program_user'
LEGACY_PUBLIC_USER_DOC_TYPE = 'public_program_user'

PUBLIC_ENROLLMENT_INDEX_TYPE = 'public_enrollment'
PRIVATE_ENROLLMENT_INDEX_TYPE = 'private_enrollment'
PERCOLATE_INDEX_TYPE = 'percolate'

GLOBAL_DOC_TYPE = 'doc'

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
            verify_indices = verify_indices.union(get_aliases_and_doc_type(index_type)[0])
    for verify_index in verify_indices:
        if not _CONN.indices.exists(verify_index):
            raise ReindexException("Unable to find index {index_name}".format(
                index_name=verify_index
            ))

    _CONN_VERIFIED = True
    return _CONN


def make_new_backing_index_name():
    """
    Make a unique name for use for a backing index

    Returns:
        str: A new name for a backing index
    """
    return "{prefix}_{hash}".format(
        prefix=settings.ELASTICSEARCH_INDEX,
        hash=uuid.uuid4().hex,
    )


def make_new_alias_name(index_type, *, is_reindexing):
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


def get_legacy_default_alias():
    """
    Get name for the alias to the legacy index

    Returns:
        str: The name of the legacy alias
    """
    return "{}_alias".format(settings.ELASTICSEARCH_INDEX)


def _get_new_active_aliases_for_type(index_type):
    """
    Get aliases for active indexes. This is used to allow indexing of documents during a recreate_index

    Args:
        index_type (str): An index type

    Returns:
        tuple of str:
            The alias for default, the alias for reindexing (if it exists)
    """
    conn = get_conn(verify=False)
    default_alias = make_new_alias_name(index_type, is_reindexing=False)
    temp_alias = make_new_alias_name(index_type, is_reindexing=True)
    if conn.indices.exists(temp_alias):
        return default_alias, temp_alias
    else:
        return default_alias,


def _has_upgraded_to_elasticsearch_5():
    """
    If the legacy mapping exists then we are still on 2.4

    Returns:
        bool:
            True if we have run recreate_index at least once after upgrading to Elasticsearch 5
    """
    conn = get_conn(verify=False)
    index_name = make_new_alias_name(PRIVATE_ENROLLMENT_INDEX_TYPE, is_reindexing=False)
    return conn.indices.exists(index_name)


def get_aliases_and_doc_type(index_type):
    """
    Depending on whether or not we upgraded to the new schema for Elasticsearch 5,
    return the doc type and index to use

    Args:
        index_type (str): The index type

    Returns:
        tuple:
            (a tuple of aliases to update, the doc type to use for the indexing)
            The tuple of aliases will always be (default, reindexing), or (default,) if reindexing doesn't exist
    """
    mapping = {
        PRIVATE_ENROLLMENT_INDEX_TYPE: LEGACY_USER_DOC_TYPE,
        PUBLIC_ENROLLMENT_INDEX_TYPE: LEGACY_PUBLIC_USER_DOC_TYPE,
        PERCOLATE_INDEX_TYPE: LEGACY_PERCOLATE_DOC_TYPE,
    }

    legacy_doc_type = mapping[index_type]
    if _has_upgraded_to_elasticsearch_5():
        return _get_new_active_aliases_for_type(index_type), GLOBAL_DOC_TYPE
    else:
        return (get_legacy_default_alias(), ), legacy_doc_type


def get_default_alias_and_doc_type(index_type):
    """
    Depending on whether or not we upgraded to the new schema for Elasticsearch 5,
    return the doc type and index to use

    Args:
        index_type (str): The index type

    Returns:
        tuple: (the default alias to update, the doc type to use for the indexing)
    """
    aliases, doc_type = get_aliases_and_doc_type(index_type)
    return aliases[0], doc_type
