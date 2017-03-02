"""
Functions for executing ES searches
"""
from django.conf import settings
from elasticsearch_dsl import Search, Q

from roles.api import get_advance_searchable_programs
from search.connection import (
    get_default_alias,
    get_conn,
    DOC_TYPES,
    USER_DOC_TYPE,
)
from search.models import PercolateQuery
from search.exceptions import NoProgramAccessException

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
    get_conn()
    return search_obj.execute()


def create_program_limit_query(user, filter_on_email_optin=False):
    """
    Constructs and returns a query that limits a user to data for their allowed programs

    Args:
        user (django.contrib.auth.models.User): A user
        filter_on_email_optin (bool): If true, filter out profiles where email_optin != true

    Returns:
        elasticsearch_dsl.query.Q: An elasticsearch query
    """
    users_allowed_programs = get_advance_searchable_programs(user)
    # if the user cannot search any program, raise an exception.
    # in theory this should never happen because `UserCanSearchPermission`
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
    search_obj = Search(index=get_default_alias(), doc_type=DOC_TYPES)
    # Update from search params first so our server-side filtering will overwrite it if necessary
    if search_param_dict is not None:
        search_obj.update_from_dict(search_param_dict)
        # Early versions of searchkit use filter which isn't in the DSL but it acts equivalently to post_filter
        if 'filter' in search_param_dict:
            search_obj = search_obj.post_filter(search_param_dict['filter'])

    # Limit results to one of the programs the user is staff on
    search_obj = search_obj.filter(create_program_limit_query(
        user,
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


def prepare_and_execute_search(user, search_param_dict=None, search_func=execute_search, filter_on_email_optin=False):
    """
    Prepares a Search object and executes the search against ES
    """
    search_obj = create_search_obj(
        user,
        search_param_dict=search_param_dict,
        filter_on_email_optin=filter_on_email_optin
    )
    return search_func(search_obj)


def get_all_query_matching_emails(search_obj, page_size=DEFAULT_ES_LOOP_PAGE_SIZE):
    """
    Retrieves all unique emails for documents that match an ES query

    Args:
        search_obj (Search): Search object
        page_size (int): Number of docs per page of results

    Returns:
        set: Set of unique emails
    """
    results = set()
    # Maintaining a consistent sort on '_doc' will help prevent bugs where the
    # index is altered during the loop.
    # This also limits the query to only return the 'email' field.
    search_obj = search_obj.sort('_doc').fields('email')
    loop = 0
    all_results_returned = False
    while not all_results_returned:
        from_index = loop * page_size
        to_index = from_index + page_size
        search_results = execute_search(search_obj[from_index: to_index])
        # add the email for every search result hit to the set
        for hit in search_results.hits:
            results.add(hit.email[0])
        all_results_returned = to_index >= search_results.hits.total
        loop += 1
    return results


def search_percolate_queries(program_enrollment_id):
    """
    Find all PercolateQuery objects whose queries match a user document

    Args:
        program_enrollment_id (int): A ProgramEnrollment id

    Returns:
        django.db.models.query.QuerySet: A QuerySet of PercolateQuery matching the percolate results
    """
    conn = get_conn()
    result = conn.percolate(settings.ELASTICSEARCH_INDEX, USER_DOC_TYPE, id=program_enrollment_id)
    result_ids = [row['_id'] for row in result['matches']]
    return PercolateQuery.objects.filter(id__in=result_ids)


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
    return Search.from_dict(updated_search_dict)
