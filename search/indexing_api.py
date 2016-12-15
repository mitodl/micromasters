"""
Functions for ES indexing
"""
from itertools import islice
import logging

from django.conf import settings
from elasticsearch.helpers import bulk
from elasticsearch.exceptions import NotFoundError
from elasticsearch_dsl import Mapping
from elasticsearch_dsl.connections import connections

from profiles.models import Profile
from profiles.serializers import ProfileSerializer
from dashboard.models import ProgramEnrollment
from dashboard.serializers import UserProgramSearchSerializer
from search.exceptions import ReindexException

log = logging.getLogger(__name__)

USER_DOC_TYPE = 'program_user'
DOC_TYPES = (USER_DOC_TYPE, )
_CONN = None
# When we create the connection, check to make sure all appropriate mappings exist
_CONN_VERIFIED = False
# A string which must be indexed exactly as is and not stemmed for full text search (the default)
NOT_ANALYZED_STRING_TYPE = {
    'type': 'string',
    'index': 'not_analyzed',
}
BOOL_TYPE = {'type': 'boolean'}
DATE_TYPE = {'type': 'date', 'format': 'date'}
LONG_TYPE = {'type': 'long'}


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


def _index_program_enrolled_users_chunk(program_enrollments):
    """
    Add/update a list of ProgramEnrollment records in Elasticsearch

    Args:
        program_enrollments (list of ProgramEnrollments):
            List of ProgramEnrollments to serialize and index

    Returns:
        int: Number of items inserted into Elasticsearch
    """

    conn = get_conn()
    insert_count, errors = bulk(
        conn,
        (serialize_program_enrolled_user(program_enrollment) for program_enrollment in program_enrollments),
        index=settings.ELASTICSEARCH_INDEX,
        doc_type=USER_DOC_TYPE,
    )
    if len(errors) > 0:
        raise ReindexException("Error during bulk insert: {errors}".format(
            errors=errors
        ))
    refresh_index()
    return insert_count


def index_program_enrolled_users(program_enrollments, chunk_size=100):
    """
    Add/update ProgramEnrollment records in Elasticsearch.

    Args:
        program_enrollments (iterable of ProgramEnrollments):
            Iterable of ProgramEnrollments to serialize and index
        chunk_size (int):
            How many users to index at once.

    Returns:
        int: Number of indexed items
    """
    # Use an iterator so we can keep track of what's been indexed already
    program_enrollments = iter(program_enrollments)
    count = 0
    chunk = list(islice(program_enrollments, chunk_size))
    while len(chunk) > 0:
        count += _index_program_enrolled_users_chunk(chunk)
        chunk = list(islice(program_enrollments, chunk_size))
    refresh_index()
    return count


def index_users(users, chunk_size=100):
    """
    Indexes a list of users via their ProgramEnrollments
    """
    program_enrollments = ProgramEnrollment.prefetched_qset().filter(user__in=users)
    return index_program_enrolled_users(program_enrollments, chunk_size)


def remove_program_enrolled_user(program_enrollment):
    """
    Remove a program-enrolled user from Elasticsearch.
    """
    conn = get_conn()
    try:
        conn.delete(index=settings.ELASTICSEARCH_INDEX, doc_type=USER_DOC_TYPE, id=program_enrollment.id)
    except NotFoundError:
        # Item is already gone
        pass


def remove_user(user):
    """
    Remove a user from Elasticsearch.
    """
    program_enrollments = ProgramEnrollment.objects.filter(user=user).select_related('user', 'program').all()
    for program_enrollment in program_enrollments:
        remove_program_enrolled_user(program_enrollment)


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
        serialized['profile'] = ProfileSerializer(user.profile).data
    except Profile.DoesNotExist:
        # Just in case
        pass

    serialized['program'] = UserProgramSearchSerializer.serialize(program_enrollment)
    return serialized


def refresh_index():
    """
    Refresh the Elasticsearch index
    """
    get_conn().indices.refresh(index=settings.ELASTICSEARCH_INDEX)


def program_enrolled_user_mapping():
    """
    Builds the raw mapping data for the program-enrolled user doc type
    """
    mapping = Mapping(USER_DOC_TYPE)
    mapping.field("id", "long")
    mapping.field("user_id", "long")
    mapping.field("email", NOT_ANALYZED_STRING_TYPE)
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
        'first_name': NOT_ANALYZED_STRING_TYPE,
        'gender': NOT_ANALYZED_STRING_TYPE,
        'last_name': NOT_ANALYZED_STRING_TYPE,
        'preferred_language': NOT_ANALYZED_STRING_TYPE,
        'preferred_name': NOT_ANALYZED_STRING_TYPE,
        'pretty_printed_student_id': NOT_ANALYZED_STRING_TYPE,
        'username': NOT_ANALYZED_STRING_TYPE,
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
        'is_learner': BOOL_TYPE,
        'enrollments': {'type': 'nested', 'properties': {
            'course_details': {
                'type': 'object',
                'properties': {
                    'course_modes': {
                        'type': 'nested',
                    }
                }
            }
        }},
        'certificates': {'type': 'nested'}
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


def create_program_enrolled_user_mapping():
    """
    Save the mapping for a program user. If one already exists, delete it first.
    """
    conn = get_conn(verify=False)
    index_name = settings.ELASTICSEARCH_INDEX
    if conn.indices.exists_type(index=index_name, doc_type=USER_DOC_TYPE):
        conn.indices.delete_mapping(index=index_name, doc_type=USER_DOC_TYPE)
    mapping = program_enrolled_user_mapping()
    mapping.save(index_name)


def create_mappings():
    """
    Create all mappings, deleting existing mappings if they exist.
    """
    create_program_enrolled_user_mapping()


def clear_index():
    """
    Wipe and recreate index and mapping. No indexing is done.
    """
    conn = get_conn(verify=False)
    index_name = settings.ELASTICSEARCH_INDEX
    if conn.indices.exists(index_name):
        conn.indices.delete(index_name)
    conn.indices.create(index_name)
    conn.indices.refresh()
    create_mappings()


def recreate_index():
    """
    Wipe and recreate index and mapping, and index all items.
    """
    clear_index()
    index_program_enrolled_users(ProgramEnrollment.objects.iterator())
