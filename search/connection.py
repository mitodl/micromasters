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
            verify_indices = verify_indices.union(
                (tup[0] for tup in get_aliases_and_doc_types(index_type))
            )
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


def get_aliases_and_doc_types(index_type):
    """
    Depending on whether or not we upgraded to the new schema for Elasticsearch 5,
    return a list of active indices and associated doc types to use for indexing.

    There is always one item in the returned list and the first tuple is always for the default alias.

    Args:
        index_type (str): The index type

    Returns:
        list of tuple:
            (a tuple of the alias, the doc type to use for the indexing of that alias)
            The list will always have at least one tuple, and the first is always the default, newest alias
    """
    conn = get_conn(verify=False)

    mapping = {
        PRIVATE_ENROLLMENT_INDEX_TYPE: LEGACY_USER_DOC_TYPE,
        PUBLIC_ENROLLMENT_INDEX_TYPE: LEGACY_PUBLIC_USER_DOC_TYPE,
        PERCOLATE_INDEX_TYPE: LEGACY_PERCOLATE_DOC_TYPE,
    }

    legacy_doc_type = mapping[index_type]

    default_alias = make_new_alias_name(index_type, is_reindexing=False)
    reindexing_alias = make_new_alias_name(index_type, is_reindexing=True)
    legacy_alias = get_legacy_default_alias()

    if conn.indices.exists(default_alias):
        # Elasticsearch 5
        tuples = [
            (default_alias, GLOBAL_DOC_TYPE),
            (reindexing_alias, GLOBAL_DOC_TYPE),
            (legacy_alias, legacy_doc_type),
        ]
        return [
            tup for tup in tuples if conn.indices.exists(tup[0])
        ]
    else:
        # Elasticsearch 2
        return [
            (legacy_alias, legacy_doc_type),
        ]


def get_default_alias_and_doc_type(index_type):
    """
    Depending on whether or not we upgraded to the new schema for Elasticsearch 5,
    return the doc type and index to use

    Args:
        index_type (str): The index type

    Returns:
        tuple: (the default alias to update, the doc type to use for the indexing)
    """
    return get_aliases_and_doc_types(index_type)[0]
