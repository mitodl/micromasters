"""
Celery tasks for search
"""

# The imports which are prefixed with _ are mocked to be ignored in MockedESTestCase

from dashboard.models import ProgramEnrollment
from mail.api import send_automatic_emails as _send_automatic_emails
from micromasters.celery import async
from search.indexing_api import (
    get_default_alias,
    index_program_enrolled_users as _index_program_enrolled_users,
    remove_program_enrolled_user as _remove_program_enrolled_user,
    index_users as _index_users,
    index_percolate_queries as _index_percolate_queries,
    delete_percolate_query as _delete_percolate_query,
    refresh_index as _refresh_index,
)
from search.models import PercolateQuery


def lookup_id(obj_or_id):
    """
    Handle the current and deprecated paths while the Celery queue may possibly have old and new tasks queued up.
    """
    if isinstance(obj_or_id, int):
        return obj_or_id
    else:
        # Deprecated!
        return obj_or_id.id


@async.task
def remove_program_enrolled_user(program_enrollment_id):
    """
    Remove program-enrolled user from index

    Args:
        program_enrollment_id (int): A ProgramEnrollment to remove from the index
    """
    # Deprecation warning!
    program_enrollment_id = lookup_id(program_enrollment_id)
    _remove_program_enrolled_user(program_enrollment_id)


@async.task
def index_program_enrolled_users(program_enrollment_ids):
    """
    Index program enrollments

    Args:
        program_enrollment_ids (list of int): A list of program enrollment ids
    """
    # Deprecation warning: Inline _lookup_id after next release
    program_enrollment_ids = [lookup_id(enrollment) for enrollment in program_enrollment_ids]
    program_enrollments = ProgramEnrollment.objects.filter(id__in=program_enrollment_ids)
    _index_program_enrolled_users(program_enrollments)

    # Send email for profiles that newly fit the search query for an automatic email
    _refresh_index(get_default_alias())
    for program_enrollment in program_enrollments:
        _send_automatic_emails(program_enrollment)


@async.task
def index_users(user_ids):
    """
    Index users' ProgramEnrollment documents

    Args:
        user_ids (list of int): Ids of users to update in the Elasticsearch index
    """
    # Deprecated: for old tasks user_ids may contain User objects instead of user ids
    # However it's only used in a filter(user__in=...) here and in _index_users
    # which will handle both cases by default
    _index_users(user_ids)

    # Send email for profiles that newly fit the search query for an automatic email
    _refresh_index(get_default_alias())
    for program_enrollment in ProgramEnrollment.objects.filter(user__in=user_ids):
        _send_automatic_emails(program_enrollment)


@async.task
def index_percolate_queries(percolate_query_ids):
    """
    Index percolate queries

    Args:
        percolate_query_ids (iterable of int):
            Database ids for PercolateQuery instances to index
    """
    _index_percolate_queries(PercolateQuery.objects.filter(id__in=percolate_query_ids))


@async.task
def delete_percolate_query(percolate_query_id):
    """
    Delete a percolate query in Elasticsearch

    Args:
        percolate_query_id (int): A PercolateQuery id
    """
    _delete_percolate_query(percolate_query_id)
