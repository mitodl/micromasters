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


def get_conn(verify=True):
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
    index_name = settings.ELASTICSEARCH_INDEX
    if not _CONN.indices.exists(index_name):
        raise ReindexException("Unable to find index {index_name}".format(
            index_name=index_name
        ))

    mappings = _CONN.indices.get_mapping()[index_name]["mappings"]
    for doc_type in DOC_TYPES:
        if doc_type not in mappings.keys():
            raise ReindexException("Mapping {doc_type} not found".format(
                doc_type=doc_type
            ))

    _CONN_VERIFIED = True
    return _CONN
