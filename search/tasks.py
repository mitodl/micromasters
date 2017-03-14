"""
Celery tasks for search
"""

# The imports which are prefixed with _ are mocked to be ignored in MockedESTestCase

from dashboard.models import ProgramEnrollment
from mail.api import send_automatic_emails as _send_automatic_emails
from micromasters.celery import async
from search.indexing_api import (
    index_program_enrolled_users as _index_program_enrolled_users,
    remove_program_enrolled_user as _remove_program_enrolled_user,
    index_users as _index_users,
    remove_user as _remove_user,
    index_percolate_queries as _index_percolate_queries,
    delete_percolate_query as _delete_percolate_query,
)
from search.models import PercolateQuery


@async.task
def remove_program_enrolled_user(user):
    """
    Remove program-enrolled user from index

    Args:
        user (User): A program-enrolled user to remove from index
    """
    _remove_program_enrolled_user(user)


@async.task
def index_program_enrolled_users(program_enrollments):
    """
    Index profiles

    Args:
        program_enrollments (list of ProgramEnrollments): Program-enrolled users to remove from index
    """
    _index_program_enrolled_users(program_enrollments)

    # Send email for profiles that newly fit the search query for an automatic email
    for program_enrollment in program_enrollments:
        _send_automatic_emails(program_enrollment)


@async.task
def index_users(users):
    """
    Index users

    Args:
        users (list of Users): Users to update in the Elasticsearch index
    """
    _index_users(users)

    # Send email for profiles that newly fit the search query for an automatic email
    for program_enrollment in ProgramEnrollment.objects.filter(user__in=users):
        _send_automatic_emails(program_enrollment)


@async.task
def remove_user(user):
    """
    Remove user from index

    Args:
        user (User): A user to remove from index
    """
    _remove_user(user)


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
