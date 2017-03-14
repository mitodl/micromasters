"""Manages the Elasticsearch connection"""
from django.conf import settings
from elasticsearch_dsl.connections import connections

from search.exceptions import ReindexException


_CONN = None
# When we create the connection, check to make sure all appropriate mappings exist
_CONN_VERIFIED = False
# This is a builtin type
PERCOLATE_DOC_TYPE = '.percolator'

USER_DOC_TYPE = 'program_user'
DOC_TYPES = (USER_DOC_TYPE, )


def get_conn(verify=True, verify_index=None):
    """
    Lazily create the connection.
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
    if verify_index is None:
        verify_index = get_default_alias()
    if not _CONN.indices.exists(verify_index):
        raise ReindexException("Unable to find index {index_name}".format(
            index_name=verify_index
        ))

    for doc_type in DOC_TYPES:
        mapping = _CONN.indices.get_mapping(index=verify_index, doc_type=doc_type)
        if not mapping:
            raise ReindexException("Mapping {doc_type} not found".format(
                doc_type=doc_type
            ))

    _CONN_VERIFIED = True
    return _CONN


def get_temp_alias():
    """
    Get name for alias to a the temporary index
    """
    return "{}_temp".format(settings.ELASTICSEARCH_INDEX)


def get_default_alias():
    """
    Get name for the alias to the default index
    """
    return "{}_alias".format(settings.ELASTICSEARCH_INDEX)


def get_active_aliases():
    """
    Get aliases for active indexes.
    """
    conn = get_conn(verify=False)
    aliases = []
    for alias in (get_default_alias(), get_temp_alias()):
        if conn.indices.exists(alias):
            aliases.append(alias)
    return aliases
