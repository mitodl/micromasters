"""
Functions for executing ES searches
"""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q as Query
from elasticsearch_dsl import Search, Q

from courses.models import Program
from dashboard.models import ProgramEnrollment
from profiles.models import Profile
from roles.api import get_advance_searchable_program_ids
from search.connection import (
    get_default_alias,
    get_conn,
    USER_DOC_TYPE,
    PUBLIC_USER_DOC_TYPE,
)
from search.models import PercolateQuery
from search.exceptions import (
    NoProgramAccessException,
    PercolateException,
)
from search.indexing_api import serialize_program_enrolled_user

DEFAULT_ES_LOOP_PAGE_SIZE = 100


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
        # create_search_obj which sets important fields like the index and doc_type.
        raise ImproperlyConfigured("search object is missing an index")

    get_conn()
    return search_obj.execute()


def get_searchable_programs(user, staff_program_ids):
    """
    Determines the programs a user is eligible to search

    Args:
        user (django.contrib.auth.models.User): the user that is searching
        staff_program_ids (list of int): the list of program ids the user is staff for if any

    Returns:
        set(courses.models.Program): set of programs the user can search in
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


def _get_search_doc_types(is_advance_search_capable):
    """
    Determines searchable doc types based on search capabilities

    Args:
        is_advance_search_capable (bool): If true, allows user to perform staff search
    """
    return (USER_DOC_TYPE,) if is_advance_search_capable else (PUBLIC_USER_DOC_TYPE,)


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
    search_obj = Search(index=get_default_alias(), doc_type=_get_search_doc_types(is_advance_search_capable))
    # Update from search params first so our server-side filtering will overwrite it if necessary
    if search_param_dict is not None:
        search_obj.update_from_dict(search_param_dict)

    if not is_advance_search_capable:
        # Learners can't search for other learners with privacy set to private
        search_obj = search_obj.filter(
            ~Q('term', **{'profile.account_privacy': Profile.PRIVATE})
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


def search_for_field(search_obj, field_name, page_size=DEFAULT_ES_LOOP_PAGE_SIZE):
    """
    Retrieves all unique instances of a field for documents that match an ES query

    Args:
        search_obj (Search): Search object
        field_name (str): The name of the field for the value to get
        page_size (int): Number of docs per page of results

    Returns:
        set: Set of unique values
    """
    results = set()
    # Maintaining a consistent sort on '_doc' will help prevent bugs where the
    # index is altered during the loop.
    # This also limits the query to only return the field value.
    search_obj = search_obj.sort('_doc').fields(field_name)
    loop = 0
    all_results_returned = False
    while not all_results_returned:
        from_index = loop * page_size
        to_index = from_index + page_size
        search_results = execute_search(search_obj[from_index: to_index])
        # add the field value for every search result hit to the set
        for hit in search_results.hits:
            results.add(getattr(hit, field_name)[0])
        all_results_returned = to_index >= search_results.hits.total
        loop += 1
    return results


def get_all_query_matching_emails(search_obj, page_size=DEFAULT_ES_LOOP_PAGE_SIZE):
    """
    Retrieves all unique emails for documents that match an ES query

    Args:
        search_obj (Search): Search object
        page_size (int): Number of docs per page of results

    Returns:
        set: Set of unique emails
    """
    return search_for_field(search_obj, "email", page_size=page_size)


def search_percolate_queries(program_enrollment_id, source_type):
    """
    Find all PercolateQuery objects whose queries match a user document

    Args:
        program_enrollment_id (int): A ProgramEnrollment id
        source_type (str): The type of the percolate query to filter on

    Returns:
        django.db.models.query.QuerySet: A QuerySet of PercolateQuery matching the percolate results
    """
    conn = get_conn()
    enrollment = ProgramEnrollment.objects.get(id=program_enrollment_id)
    doc = serialize_program_enrolled_user(enrollment)
    # We don't need this to search for percolator queries and
    # it causes a dynamic mapping failure so we need to remove it
    del doc['_id']
    result = conn.percolate(get_default_alias(), USER_DOC_TYPE, body={"doc": doc})
    failures = result.get('_shards', {}).get('failures', [])
    if len(failures) > 0:
        raise PercolateException("Failed to percolate: {}".format(failures))
    result_ids = [row['_id'] for row in result['matches']]
    return PercolateQuery.objects.filter(id__in=result_ids, source_type=source_type)


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
    updated_search = Search(index=search._index, doc_type=search._doc_type)  # pylint: disable=protected-access
    updated_search.update_from_dict(updated_search_dict)
    return updated_search
