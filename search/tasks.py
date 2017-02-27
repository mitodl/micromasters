"""
Celery tasks for search
"""

from micromasters.celery import async
from search.indexing_api import (
    index_program_enrolled_users as _index_program_enrolled_users,
    remove_program_enrolled_user as _remove_program_enrolled_user,
    index_users as _index_users,
    remove_user as _remove_user,
    index_percolate_queries as _index_percolate_queries,
    delete_percolate_query as _delete_percolate_query,
)


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
        program_enrollments (iterable of ProgramEnrollments): Program-enrolled users to remove from index
    """
    _index_program_enrolled_users(program_enrollments)


@async.task
def index_users(users):
    """
    Index users

    Args:
        users (iterable of Users): Users to update in the Elasticsearch index
    """
    _index_users(users)


@async.task
def remove_user(user):
    """
    Remove user from index

    Args:
        user (User): A user to remove from index
    """
    _remove_user(user)


@async.task
def index_percolate_queries(percolate_queries):
    """
    Index percolate queries

    Args:
        percolate_queries (iterable of PercolateQuery): Queries to update in Elasticsearch
    """
    _index_percolate_queries(percolate_queries)


@async.task
def delete_percolate_query(percolate_query):
    """
    Delete a percolate query in Elasticsearch

    Args:
        percolate_query (search.models.PercolateQuery): A PercolateQuery
    """
    _delete_percolate_query(percolate_query)
