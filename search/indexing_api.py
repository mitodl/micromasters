"""
Functions for ES indexing
"""
from datetime import datetime
from itertools import islice
import logging
from uuid import uuid4

from django.conf import settings
from elasticsearch.helpers import bulk
from elasticsearch.exceptions import NotFoundError
from elasticsearch_dsl import Mapping
import pytz

from profiles.models import Profile
from profiles.serializers import ProfileSerializer
from dashboard.models import ProgramEnrollment
from dashboard.serializers import UserProgramSearchSerializer
from search.connection import (
    get_active_aliases,
    get_default_alias,
    get_conn,
    get_temp_alias,
    USER_DOC_TYPE,
    PERCOLATE_DOC_TYPE,
)
from search.exceptions import ReindexException
from search.models import PercolateQuery

log = logging.getLogger(__name__)

# A string which must be indexed exactly as is and not stemmed for full text search (the default)
NOT_ANALYZED_STRING_TYPE = {
    'type': 'string',
    'index': 'not_analyzed',
}
# Used for cases where we need to support full text search
FOLDED_SEARCHABLE_STRING_TYPE = {
    'type': 'string',
    'index': 'not_analyzed',
    'fields': {
        'folded': {
            'type': 'string',
            'analyzer': 'folding',
        }
    }
}
BOOL_TYPE = {'type': 'boolean'}
DATE_TYPE = {'type': 'date', 'format': 'date'}
LONG_TYPE = {'type': 'long'}


def _index_chunk(chunk, doc_type, index):
    """
    Add/update a list of records in Elasticsearch

    Args:
        chunk (list):
            List of serialized items to index
        doc_type (str):
            The doc type for each item
        index (str): An Elasticsearch index

    Returns:
        int: Number of items inserted into Elasticsearch
    """

    conn = get_conn(verify_index=index)
    insert_count, errors = bulk(
        conn,
        chunk,
        index=index,
        doc_type=doc_type,
    )
    if len(errors) > 0:
        raise ReindexException("Error during bulk insert: {errors}".format(
            errors=errors
        ))

    refresh_index(index)
    return insert_count


def _index_chunks(items, doc_type, index, chunk_size=100):
    """
    Add/update records in Elasticsearch.

    Args:
        items (iterable):
            Iterable of serialized items to index
        doc_type (str): The doc type for the items to be indexed
        index (str): An Elasticsearch index
        chunk_size (int):
            How many items to index at once.

    Returns:
        int: Number of indexed items
    """
    # Use an iterator so we can keep track of what's been indexed already
    log.info("Indexing chunks of type %s, chunk_size=%d...", doc_type, chunk_size)
    items = iter(items)
    count = 0
    chunk = list(islice(items, chunk_size))
    while len(chunk) > 0:
        count += _index_chunk(chunk, doc_type, index)
        log.info("Indexed %d items...", count)
        chunk = list(islice(items, chunk_size))
    log.info("Indexing done, refreshing index...")
    refresh_index(index)
    log.info("Finished indexing %s", doc_type)
    return count


def _delete_item(document_id, doc_type, index):
    """
    Helper function to delete a document

    Args:
        document_id (int): A document id
        doc_type (str): A document type
        index (str): An Elasticsearch index
    """
    conn = get_conn(verify_index=index)
    try:
        conn.delete(index=index, doc_type=doc_type, id=document_id)
    except NotFoundError:
        # Item is already gone
        pass


def index_program_enrolled_users(program_enrollments, indices=None, chunk_size=100):
    """
    Bulk index an iterable of ProgramEnrollments

    Args:
        program_enrollments (iterable of ProgramEnrollment): An iterable of program enrollments
        indices (list of str): A list of Elasticsearch indices. If None, uses Django Elasticsearch index setting
        chunk_size (int): The number of items per chunk to index

    Returns:
        int: Number of indexed items
    """
    if indices is None:
        indices = get_active_aliases()

    count = 0
    for index in indices:
        count = _index_chunks(
            (serialize_program_enrolled_user(program_enrollment) for program_enrollment in program_enrollments),
            USER_DOC_TYPE,
            index,
            chunk_size=chunk_size,
        )
    # Both counts should be the same
    return count


def index_users(users, chunk_size=100):
    """
    Indexes a list of users via their ProgramEnrollments
    """
    program_enrollments = ProgramEnrollment.prefetched_qset().filter(user__in=users)
    return index_program_enrolled_users(program_enrollments, chunk_size=chunk_size)


def remove_program_enrolled_user(program_enrollment, indices=None):
    """
    Remove a program-enrolled user from Elasticsearch.
    """
    if indices is None:
        indices = get_active_aliases()

    for index in indices:
        _delete_item(program_enrollment.id, USER_DOC_TYPE, index)


def serialize_program_enrolled_user(program_enrollment):
    """
    Serializes a program-enrolled user for use with Elasticsearch.

    Args:
        program_enrollment (ProgramEnrollment): A program_enrollment to serialize
    Returns:
        dict: The data to be sent to Elasticsearch
    """
    user = program_enrollment.user
    serialized = {
        'id': program_enrollment.id,
        '_id': program_enrollment.id,
        'user_id': user.id,
        'email': user.email
    }
    try:
        serialized['profile'] = filter_current_work(ProfileSerializer(user.profile).data)
    except Profile.DoesNotExist:
        # Just in case
        pass

    serialized['program'] = UserProgramSearchSerializer.serialize(program_enrollment)
    return serialized


def filter_current_work(profile):
    """
    Remove work_history objects that are not current
    Args:
        profile (dict): serialized user Profile
    Returns:
        dict: Profile with filtered current work_history list
    """
    mod_profile = dict(profile)
    mod_profile['work_history'] = [work for work in mod_profile['work_history'] if not work['end_date']]
    return mod_profile


def refresh_index(index):
    """
    Refresh the Elasticsearch index
    """
    get_conn(verify_index=index).indices.refresh(index=index)


def program_enrolled_user_mapping():
    """
    Builds the raw mapping data for the program-enrolled user doc type
    """
    mapping = Mapping(USER_DOC_TYPE)
    mapping.field("id", "long")
    mapping.field("user_id", "long")
    mapping.field("email", FOLDED_SEARCHABLE_STRING_TYPE)
    mapping.field("profile", "object", properties={
        'account_privacy': NOT_ANALYZED_STRING_TYPE,
        'agreed_to_terms_of_service': BOOL_TYPE,
        'birth_city': NOT_ANALYZED_STRING_TYPE,
        'birth_country': NOT_ANALYZED_STRING_TYPE,
        'birth_state_or_territory': NOT_ANALYZED_STRING_TYPE,
        'city': NOT_ANALYZED_STRING_TYPE,
        'country': NOT_ANALYZED_STRING_TYPE,
        'date_of_birth': DATE_TYPE,
        'education': {'type': 'nested', 'properties': {
            'degree_name': NOT_ANALYZED_STRING_TYPE,
            'field_of_study': NOT_ANALYZED_STRING_TYPE,
            'graduation_date': DATE_TYPE,
            'id': LONG_TYPE,
            'online_degree': BOOL_TYPE,
            'school_city': NOT_ANALYZED_STRING_TYPE,
            'school_country': NOT_ANALYZED_STRING_TYPE,
            'school_name': NOT_ANALYZED_STRING_TYPE,
            'school_state_or_territory': NOT_ANALYZED_STRING_TYPE,
        }},
        'email_optin': BOOL_TYPE,
        'filled_out': BOOL_TYPE,
        'first_name': FOLDED_SEARCHABLE_STRING_TYPE,
        'full_name': FOLDED_SEARCHABLE_STRING_TYPE,
        'gender': NOT_ANALYZED_STRING_TYPE,
        'last_name': FOLDED_SEARCHABLE_STRING_TYPE,
        'preferred_language': NOT_ANALYZED_STRING_TYPE,
        'preferred_name': FOLDED_SEARCHABLE_STRING_TYPE,
        'pretty_printed_student_id': NOT_ANALYZED_STRING_TYPE,
        'username': FOLDED_SEARCHABLE_STRING_TYPE,
        'work_history': {'type': 'nested', 'properties': {
            'city': NOT_ANALYZED_STRING_TYPE,
            'company_name': NOT_ANALYZED_STRING_TYPE,
            'country': NOT_ANALYZED_STRING_TYPE,
            'id': LONG_TYPE,
            'industry': NOT_ANALYZED_STRING_TYPE,
            'position': NOT_ANALYZED_STRING_TYPE,
            'start_date': DATE_TYPE,
            'state_or_territory': NOT_ANALYZED_STRING_TYPE,
        }},
    })
    mapping.field("program", "object", properties={
        'id': LONG_TYPE,
        'grade_average': LONG_TYPE,
        'num_courses_passed': LONG_TYPE,
        'total_courses': LONG_TYPE,
        'is_learner': BOOL_TYPE,
        'final_grades': {'type': 'nested', 'properties': {
            'title':  NOT_ANALYZED_STRING_TYPE,
            'grade': LONG_TYPE
        }},
        'enrollments': {'type': 'nested', 'properties': {
            'level': LONG_TYPE,
            'ancestors': NOT_ANALYZED_STRING_TYPE,
            'value': NOT_ANALYZED_STRING_TYPE,
            'order': LONG_TYPE
        }},
        'semester_enrollments': {'type': 'nested', 'properties': {
            'semester': NOT_ANALYZED_STRING_TYPE
        }}
    })
    # Make strings not_analyzed by default
    mapping.meta('dynamic_templates', [{
        "notanalyzed": {
            "match": "*",
            "match_mapping_type": "string",
            "mapping": NOT_ANALYZED_STRING_TYPE
        }
    }])
    return mapping


def _create_mappings(index_name):
    """
    Create all mappings, deleting existing mappings if they exist.
    """
    conn = get_conn(verify=False)
    if conn.indices.exists_type(index=index_name, doc_type=USER_DOC_TYPE):
        conn.indices.delete_mapping(index=index_name, doc_type=USER_DOC_TYPE)
    mapping = program_enrolled_user_mapping()
    mapping.save(index_name)


def clear_index(index_name):
    """
    Wipe and recreate index and mapping. No indexing is done.

    Args:
        index_name (str): The name of the backing Elasticsearch index
    """
    conn = get_conn(verify=False)
    if conn.indices.exists(index_name):
        conn.indices.delete(index_name)
    # from https://www.elastic.co/guide/en/elasticsearch/guide/current/asciifolding-token-filter.html
    conn.indices.create(index_name, body={
        'settings': {
            'analysis': {
                'analyzer': {
                    'folding': {
                        'tokenizer': 'standard',
                        'filter': [
                            'lowercase',
                            'asciifolding',  # remove accents if we use folding analyzer
                        ]
                    }
                }
            }
        }
    })

    conn.indices.refresh()
    _create_mappings(index_name)


def delete_index(indices=None):
    """
    Drop the indices without re-creating it
    """
    if indices is None:
        indices = get_active_aliases()

    conn = get_conn(verify=False)
    for index in indices:
        if conn.indices.exists(index):
            conn.indices.delete(index)


def recreate_index():
    """
    Wipe and recreate index and mapping, and index all items.
    """
    conn = get_conn(verify=False)

    # Create new backing index for reindex
    new_backing_index = "{index}_{uuid}".format(
        index=settings.ELASTICSEARCH_INDEX,
        uuid=uuid4().hex,
    )
    clear_index(new_backing_index)

    # Clear away temp alias so we can reuse it
    temp_alias = get_temp_alias()
    if conn.indices.exists_alias(name=temp_alias):
        # Deletes both alias and backing indexes
        conn.indices.delete(temp_alias)

    # Point temp_alias toward new backing index
    conn.indices.put_alias(index=new_backing_index, name=temp_alias)

    # Do the indexing on the temp index
    start = datetime.now(pytz.UTC)
    try:
        log.info("Indexing %d program enrollments...", ProgramEnrollment.objects.count())
        index_program_enrolled_users(ProgramEnrollment.objects.iterator(), [new_backing_index])
        log.info("Indexing %d percolator queries...", PercolateQuery.objects.count())
        index_percolate_queries(PercolateQuery.objects.iterator(), [new_backing_index])

        # Point default alias to new index and delete the old backing index, if any
        log.info("Done with temporary index. Pointing default alias to newly created backing index...")
        default_alias = get_default_alias()
        actions = []
        old_backing_indexes = []
        if conn.indices.exists_alias(name=default_alias):
            # Should only be one backing index in normal circumstances
            old_backing_indexes = list(conn.indices.get_alias(name=default_alias).keys())
            for index in old_backing_indexes:
                actions.append({
                    "remove": {
                        "index": index,
                        "alias": default_alias,
                    }
                })
        actions.append({
            "add": {
                "index": new_backing_index,
                "alias": default_alias,
            },
        })
        conn.indices.update_aliases({
            "actions": actions
        })

        refresh_index(new_backing_index)
        for index in old_backing_indexes:
            conn.indices.delete(index)
    finally:
        conn.indices.delete_alias(name=temp_alias, index=new_backing_index)
    end = datetime.now(pytz.UTC)
    log.info("recreate_index took %d seconds", (end - start).total_seconds())


def _serialize_percolate_query(query):
    """
    Serialize PercolateQuery for Elasticsearch indexing

    Args:
        query (PercolateQuery): A PercolateQuery instance

    Returns:
        dict:
            This is the query dict value with `_id` set to the database id so that ES can update this in place.
    """
    to_index = dict(query.query)
    to_index["_id"] = query.id
    return to_index


def index_percolate_queries(percolate_queries, indices=None, chunk_size=100):
    """
    Index percolate queries

    Args:
        percolate_queries (iterable of PercolateQuery):
            An iterable of PercolateQuery
        indices (list): A list of Elasticsearch indexes. If None, uses the Django default Elasticsearch index
        chunk_size (int): Number of queries to index per chunk

    Returns:
        int: Number of indexed items
    """
    if indices is None:
        indices = get_active_aliases()

    count = 0
    for index in indices:
        count = _index_chunks(
            (_serialize_percolate_query(query) for query in percolate_queries),
            PERCOLATE_DOC_TYPE,
            index,
            chunk_size=chunk_size,
        )
    # Both counts should be the same
    return count


def delete_percolate_query(percolate_query_id, indices=None):
    """
    Remove a percolate query from Elasticsearch

    Args:
        percolate_query_id (int):
            The id of a deleted PercolateQuery
        indices (list of str): A list of Elasticsearch indexes. If None, uses the Django default Elasticsearch index
    """
    if indices is None:
        indices = get_active_aliases()

    for index in indices:
        _delete_item(percolate_query_id, PERCOLATE_DOC_TYPE, index)
