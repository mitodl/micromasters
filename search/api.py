"""
Functions for executing ES searches
"""
from django.conf import settings
from elasticsearch_dsl import Search, Q

from roles.api import get_advance_searchable_programs
from search.indexing_api import (
    get_conn,
    DOC_TYPES,
)
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


def create_program_limit_query(user):
    """
    Constructs and returns a query that limits a user to data for their allowed programs
    """
    users_allowed_programs = get_advance_searchable_programs(user)
    # if the user cannot search any program, raise an exception.
    # in theory this should never happen because `UserCanSearchPermission`
    # takes care of doing the same check, but better to keep it to avoid
    # that a theoretical bug exposes all the data in the index
    if not users_allowed_programs:
        raise NoProgramAccessException()

    # no matter what the query is, limit the programs to the allowed ones
    # if this is a superset of what searchkit sends, this will not impact the result
    return Q(
        'bool',
        should=[
            Q('term', **{'program.id': program.id}) for program in users_allowed_programs
        ],
        must=[
            Q('term', **{'program.is_learner': True})
        ]
    )


def create_search_obj(user, search_param_dict=None):
    """
    Creates a search object and prepares it with metadata and query parameters that
    we want to apply for all ES requests

    Args:
        user (User): User object
        search_param_dict (dict): A dict representing the body of an ES query

    Returns:
        Search: elasticsearch_dsl Search object
    """
    search_obj = Search(index=settings.ELASTICSEARCH_INDEX, doc_type=DOC_TYPES)
    if search_param_dict is not None:
        search_obj.update_from_dict(search_param_dict)
    search_obj = search_obj.query(create_program_limit_query(user))
    return search_obj


def prepare_and_execute_search(user, search_param_dict=None, search_func=execute_search):
    """
    Prepares a Search object and executes the search against ES
    """
    search_obj = create_search_obj(user, search_param_dict=search_param_dict)
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
