"""
Functions for executing ES searches
"""
import json
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Q as Query
from elasticsearch.exceptions import NotFoundError
from elasticsearch_dsl import Search, Q
from jsonpatch import make_patch

from courses.models import Program
from dashboard.models import ProgramEnrollment
from profiles.models import Profile
from roles.api import get_advance_searchable_program_ids
from search.connection import (
    get_default_alias,
    get_conn,
    GLOBAL_DOC_TYPE,
    PRIVATE_ENROLLMENT_INDEX_TYPE,
    PUBLIC_ENROLLMENT_INDEX_TYPE,
    PERCOLATE_INDEX_TYPE,
)
from search.models import (
    PercolateQuery,
    PercolateQueryMembership,
)
from search.exceptions import (
    NoProgramAccessException,
    PercolateException,
)
from search.indexing_api import serialize_program_enrolled_user

DEFAULT_ES_LOOP_PAGE_SIZE = 100


log = logging.getLogger(__name__)


def execute_search(search_obj):
    """
    Executes a search against ES after checking the connection

    Args:
        search_obj (Search): elasticsearch_dsl Search object

    Returns:
        elasticsearch_dsl.result.Response: ES response
    """
    # make sure there is a live connection
    if search_obj._index is None:  # pylint: disable=protected-access
        # If you're seeing this it means you're creating Search() without using
        # create_search_obj which sets important fields like the index.
        raise ImproperlyConfigured("search object is missing an index")

    get_conn()
    return search_obj.execute()


def scan_search(search_obj):
    """
    Executes a scan search after checking the connection and return a
    generator that will iterate over all the documents matching the query.

    Args:
        search_obj (Search): elasticsearch_dsl Search object

    Returns:
        generator of dict:
            A generator that will iterate over all the documents matching the query
    """
    # make sure there is a live connection
    if search_obj._index is None:  # pylint: disable=protected-access
        # If you're seeing this it means you're creating Search() without using
        # create_search_obj which sets important fields like the index.
        raise ImproperlyConfigured("search object is missing an index")

    get_conn()
    return search_obj.scan()


def get_searchable_programs(user, staff_program_ids):
    """
    Determines the programs a user is eligible to search

    Args:
        user (django.contrib.auth.models.User): the user that is searching
        staff_program_ids (list of int): the list of program ids the user is staff for if any

    Returns:
        set of courses.models.Program: set of programs the user can search in
    """

    # filter only to the staff programs or enrolled programs
    # NOTE: this has an accepted limitation that if you are staff on any program,
    # you can't use search on non-staff programs
    return set(Program.objects.filter(
        Query(id__in=staff_program_ids) if staff_program_ids else Query(programenrollment__user=user)
    ).distinct())


def create_program_limit_query(user, staff_program_ids, filter_on_email_optin=False):
    """
    Constructs and returns a query that limits a user to data for their allowed programs

    Args:
        user (django.contrib.auth.models.User): A user
        staff_program_ids (list of int): the list of program ids the user is staff for if any
        filter_on_email_optin (bool): If true, filter out profiles where email_optin != true

    Returns:
        elasticsearch_dsl.query.Q: An elasticsearch query
    """
    users_allowed_programs = get_searchable_programs(user, staff_program_ids)
    # if the user cannot search any program, raise an exception.
    # in theory this should never happen because `UserCanAdvanceSearchPermission`
    # takes care of doing the same check, but better to keep it to avoid
    # that a theoretical bug exposes all the data in the index
    if not users_allowed_programs:
        raise NoProgramAccessException()

    must = [
        Q('term', **{'program.is_learner': True})
    ]

    if filter_on_email_optin:
        must.append(Q('term', **{'profile.email_optin': True}))

    # no matter what the query is, limit the programs to the allowed ones
    # if this is a superset of what searchkit sends, this will not impact the result
    return Q(
        'bool',
        should=[
            Q('term', **{'program.id': program.id}) for program in users_allowed_programs
        ],
        # require that at least one program id matches the user's allowed programs
        minimum_should_match=1,
        must=must,
    )


def create_search_obj(user, search_param_dict=None, filter_on_email_optin=False):
    """
    Creates a search object and prepares it with metadata and query parameters that
    we want to apply for all ES requests

    Args:
        user (User): User object
        search_param_dict (dict): A dict representing the body of an ES query
        filter_on_email_optin (bool): If true, filter out profiles where email_optin != True

    Returns:
        Search: elasticsearch_dsl Search object
    """
    staff_program_ids = get_advance_searchable_program_ids(user)
    is_advance_search_capable = bool(staff_program_ids)
    index_type = PRIVATE_ENROLLMENT_INDEX_TYPE if is_advance_search_capable else PUBLIC_ENROLLMENT_INDEX_TYPE
    index = get_default_alias(index_type)
    search_obj = Search(index=index)
    # Update from search params first so our server-side filtering will overwrite it if necessary
    if search_param_dict is not None:
        search_obj.update_from_dict(search_param_dict)

    if not is_advance_search_capable:
        # Learners can't search for other learners with privacy set to private
        search_obj = search_obj.filter(
            ~Q('term', **{'profile.account_privacy': Profile.PRIVATE})  # pylint: disable=invalid-unary-operand-type
        )

    # Limit results to one of the programs the user is staff on
    search_obj = search_obj.filter(create_program_limit_query(
        user,
        staff_program_ids,
        filter_on_email_optin=filter_on_email_optin
    ))
    # Filter so that only filled_out profiles are seen
    search_obj = search_obj.filter(
        Q('term', **{'profile.filled_out': True})
    )
    # Force size to be the one we set on the server
    update_dict = {'size': settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE}
    if search_param_dict is not None and search_param_dict.get('from') is not None:
        update_dict['from'] = search_param_dict['from']
    search_obj.update_from_dict(update_dict)

    return search_obj


def prepare_and_execute_search(user, search_param_dict=None, search_func=execute_search,
                               filter_on_email_optin=False):
    """
    Prepares a Search object and executes the search against ES

    Args:
        user (User): User object
        search_param_dict (dict): A dict representing the body of an ES query
        search_func (callable): The function that executes the search
        filter_on_email_optin (bool): If true, filter out profiles where email_optin != True

    Returns:
        elasticsearch_dsl.result.Response: ES response
    """
    search_obj = create_search_obj(
        user,
        search_param_dict=search_param_dict,
        filter_on_email_optin=filter_on_email_optin,
    )
    return search_func(search_obj)


def search_for_field(search_obj, field_name):
    """
    Retrieves all unique instances of a field for documents that match an ES query

    Args:
        search_obj (Search): Search object
        field_name (str): The name of the field for the value to get

    Returns:
        set: Set of unique values
    """
    results = set()
    # Maintaining a consistent sort on '_doc' will help prevent bugs where the
    # index is altered during the loop.
    # This also limits the query to only return the field value.
    search_obj = search_obj.sort('_doc').source(include=[field_name])
    search_results = scan_search(search_obj)
    # add the field value for every search result hit to the set
    for hit in search_results:
        results.add(getattr(hit, field_name))
    return results


def get_all_query_matching_emails(search_obj):
    """
    Retrieves all unique emails for documents that match an ES query

    Args:
        search_obj (Search): Search object
        page_size (int): Number of docs per page of results

    Returns:
        set: Set of unique emails
    """
    return search_for_field(search_obj, "email")


def search_percolate_queries(program_enrollment_id, source_type):
    """
    Find all PercolateQuery objects whose queries match a user document

    Args:
        program_enrollment_id (int): A ProgramEnrollment id
        source_type (str): The type of the percolate query to filter on

    Returns:
        django.db.models.query.QuerySet: A QuerySet of PercolateQuery matching the percolate results
    """
    enrollment = ProgramEnrollment.objects.get(id=program_enrollment_id)
    result_ids = _search_percolate_queries(enrollment)
    return PercolateQuery.objects.filter(id__in=result_ids, source_type=source_type).exclude(is_deleted=True)


def _search_percolate_queries(program_enrollment):
    """
    Find all PercolateQuery ids whose queries match a user document

    Args:
        program_enrollment (ProgramEnrollment): A ProgramEnrollment

    Returns:
        list of int: A list of PercolateQuery ids
    """
    conn = get_conn()
    percolate_index = get_default_alias(PERCOLATE_INDEX_TYPE)
    doc = serialize_program_enrolled_user(program_enrollment)
    if not doc:
        return []
    # We don't need this to search for percolator queries and
    # it causes a dynamic mapping failure so we need to remove it
    del doc['_id']

    body = {
        "query": {
            "percolate": {
                "field": "query",
                "document": doc
            }
        }
    }

    result = conn.search(percolate_index, GLOBAL_DOC_TYPE, body=body)
    failures = result.get('_shards', {}).get('failures', [])
    if len(failures) > 0:
        raise PercolateException("Failed to percolate: {}".format(failures))

    return [int(row['_id']) for row in result['hits']['hits']]


def adjust_search_for_percolator(search):
    """
    Returns an updated Search which can be used with percolator.

    Percolated queries can only store the query portion of the search object
    (see https://github.com/elastic/elasticsearch/issues/19680). This will modify the original search query
    to add post_filter arguments to the query part of the search. Then all parts of the Search other than
    query will be removed.

    Args:
        search (Search): A search object

    Returns:
        Search: updated search object
    """
    search_dict = search.to_dict()
    if 'post_filter' in search_dict:
        search = search.filter(search_dict['post_filter'])

    # Remove all other keys besides query
    updated_search_dict = {}
    search_dict = search.to_dict()
    if 'query' in search_dict:
        updated_search_dict['query'] = search_dict['query']
    updated_search = Search(index=search._index)  # pylint: disable=protected-access
    updated_search.update_from_dict(updated_search_dict)
    return updated_search


def document_needs_updating(enrollment):
    """
    Get the document from elasticsearch and see if it matches what's in the database

    Args:
        enrollment (ProgramEnrollment): A program enrollment

    Returns:
        bool: True if the document needs to be updated via reindex
    """
    index = get_default_alias(PRIVATE_ENROLLMENT_INDEX_TYPE)

    conn = get_conn()
    try:
        document = conn.get(index=index, doc_type=GLOBAL_DOC_TYPE, id=enrollment.id)
    except NotFoundError:
        return True
    serialized_enrollment = serialize_program_enrolled_user(enrollment)
    del serialized_enrollment['_id']
    source = document['_source']

    if serialized_enrollment != source:
        # Convert OrderedDict to dict
        reserialized_enrollment = json.loads(json.dumps(serialized_enrollment))

        diff = make_patch(source, reserialized_enrollment).patch
        serialized_diff = json.dumps(diff, indent="    ")
        log.info("Difference found for enrollment %s: %s", enrollment, serialized_diff)
        return True
    return False


def update_percolate_memberships(user, source_type):
    """
    Updates membership in a PercolateQuery

    Args:
        user (User): A User to check for membership changes
        source_type (str): The type of the percolate query to filter on
    """
    # ensure we have a membership for each of the queries so we can acquire a lock on them
    percolate_queries = list(PercolateQuery.objects.filter(source_type=source_type).exclude(is_deleted=True))
    membership_ids = _ensure_memberships_for_queries(
        percolate_queries,
        user
    )

    # if there are no percolate queries or memberships then there's nothing to do
    if membership_ids:
        _update_memberships([query.id for query in percolate_queries], membership_ids, user)


def _ensure_memberships_for_queries(percolate_queries, user):
    """
    Ensures PercolateQueryMemberships exist for the user on the designated PercolateQueries

    Args:
        percolate_queries (list of PercolateQuery): A list of PercolateQuerys to add PercolateQueryMemberships for
        user (User): The user to ensure memberships for
    """
    membership_ids = []
    for query in percolate_queries:
        membership, _ = PercolateQueryMembership.objects.get_or_create(query=query, user=user)
        membership_ids.append(membership.id)

    return membership_ids


def _update_memberships(percolate_query_ids, membership_ids, user, force_save=False):
    """
    Atomically determine and update memberships

    Args:
        percolate_query_ids (set of int): a set of PercolateQuery.id
        membership_ids (list of int): A list of ids for PercolateQueryMemberships to update
        user (User): A User to check for membership changes
        force_save (bool): True if membership saves should be force even if no change
    """

    with transaction.atomic():
        memberships = PercolateQueryMembership.objects.filter(id__in=membership_ids).select_for_update()

        # limit the query_ids to the queries we are trying to update
        query_ids = set()
        for enrollment in user.programenrollment_set.all():
            query_ids.update(set(_search_percolate_queries(enrollment)))
        query_ids.intersection_update(percolate_query_ids)

        for membership in memberships:
            # only update if there's a delta in membership status
            is_member = membership.query_id in query_ids
            if force_save or (membership.is_member is not is_member):
                membership.is_member = is_member
                membership.needs_update = True
                membership.save()


def populate_query_memberships(percolate_query_id):
    """
    Populates PercolateQueryMemberships for the given query and enrollments

    Args:
        percolate_query_id (int): Database id for the PercolateQuery to populate
    """
    # practically this is a list of 1 query, but _ensure_memberships_for_queries requires a list
    query = PercolateQuery.objects.get(id=percolate_query_id)
    users = User.objects.filter(is_active=True).iterator()

    for user in users:
        membership_ids = _ensure_memberships_for_queries([query], user)
        _update_memberships(set([query.id]), membership_ids, user, force_save=True)
