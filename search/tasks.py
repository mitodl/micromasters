"""
Celery tasks for search
"""
import logging

from django.conf import settings
# The imports which are prefixed with _ are mocked to be ignored in MockedESTestCase

from dashboard.models import ProgramEnrollment
from discussions.api import sync_user_to_channels as _sync_user_to_channels
from mail.api import send_automatic_emails as _send_automatic_emails
from micromasters.celery import app
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


log = logging.getLogger(__name__)


def post_indexing_handler(program_enrollment_ids):
    """
    Do the work which happens after a profile is reindexed

    Args:
        program_enrollment_ids (list of int): A list of ProgramEnrollment ids
    """
    feature_sync_user = settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False)

    if not feature_sync_user:
        log.error('OPEN_DISCUSSIONS_USER_SYNC is set to False (so disabled) in the settings')

    _refresh_index(get_default_alias())
    for program_enrollment in ProgramEnrollment.objects.filter(id__in=program_enrollment_ids):
        _send_automatic_emails(program_enrollment)

        if feature_sync_user:
            _sync_user_to_channels(program_enrollment.user.id)


@app.task
def remove_program_enrolled_user(program_enrollment_id):
    """
    Remove program-enrolled user from index

    Args:
        program_enrollment_id (int): A ProgramEnrollment to remove from the index
    """
    _remove_program_enrolled_user(program_enrollment_id)


@app.task
def index_program_enrolled_users(program_enrollment_ids):
    """
    Index program enrollments

    Args:
        program_enrollment_ids (list of int): A list of program enrollment ids
    """
    program_enrollments = ProgramEnrollment.objects.filter(id__in=program_enrollment_ids)
    _index_program_enrolled_users(program_enrollments)

    # Send email for profiles that newly fit the search query for an automatic email
    post_indexing_handler(program_enrollment_ids)


@app.task
def index_users(user_ids):
    """
    Index users' ProgramEnrollment documents

    Args:
        user_ids (list of int): Ids of users to update in the Elasticsearch index
    """
    _index_users(user_ids)

    # Send email for profiles that newly fit the search query for an automatic email
    enrollment_ids = list(ProgramEnrollment.objects.filter(user__in=user_ids).values_list("id", flat=True))
    post_indexing_handler(enrollment_ids)


@app.task
def index_percolate_queries(percolate_query_ids):
    """
    Index percolate queries

    Args:
        percolate_query_ids (iterable of int):
            Database ids for PercolateQuery instances to index
    """
    _index_percolate_queries(PercolateQuery.objects.filter(id__in=percolate_query_ids))


@app.task
def delete_percolate_query(percolate_query_id):
    """
    Delete a percolate query in Elasticsearch

    Args:
        percolate_query_id (int): A PercolateQuery id
    """
    _delete_percolate_query(percolate_query_id)
