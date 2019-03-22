"""
Celery tasks for search
"""
import logging

from django.conf import settings
# The imports which are prefixed with _ are mocked to be ignored in MockedESTestCase

from dashboard.models import ProgramEnrollment
from mail.api import send_automatic_emails as _send_automatic_emails
from micromasters.celery import app
from search import api
from search.api import (
    document_needs_updating as _document_needs_updating,
    update_percolate_memberships as _update_percolate_memberships,
)
from search.indexing_api import (
    refresh_all_default_indices as _refresh_all_default_indices,
    index_program_enrolled_users as _index_program_enrolled_users,
    remove_program_enrolled_user as _remove_program_enrolled_user,
    index_percolate_queries as _index_percolate_queries,
    delete_percolate_query as _delete_percolate_query,
)
from search.models import PercolateQuery


log = logging.getLogger(__name__)


def post_indexing_handler(program_enrollments):
    """
    Do the work which happens after a profile is reindexed

    Args:
        program_enrollments (list of ProgramEnrollment): A list of ProgramEnrollments
    """
    feature_sync_user = settings.FEATURES.get('OPEN_DISCUSSIONS_USER_SYNC', False)

    if not feature_sync_user:
        log.debug('OPEN_DISCUSSIONS_USER_SYNC is set to False (so disabled) in the settings')

    _refresh_all_default_indices()
    for program_enrollment in program_enrollments:
        try:
            _send_automatic_emails(program_enrollment)
        except:  # pylint: disable=bare-except
            log.exception("Error sending automatic email for enrollment %s", program_enrollment)

        # only update for discussion queries for now
        try:
            _update_percolate_memberships(program_enrollment.user, PercolateQuery.DISCUSSION_CHANNEL_TYPE)
        except:  # pylint: disable=bare-except
            log.exception("Error syncing %s to channels", program_enrollment.user)


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
    post_indexing_handler(program_enrollments)


@app.task
def index_users(user_ids, check_if_changed=False):
    """
    Index users' ProgramEnrollment documents

    Args:
        user_ids (list of int): Ids of users to update in the Elasticsearch index
        check_if_changed (bool):
            If true, read the document from elasticsearch before indexing and
            check if the serialized value would be different.
    """
    enrollments = list(ProgramEnrollment.objects.filter(user__in=user_ids))

    if check_if_changed:
        enrollments = [
            enrollment for enrollment in enrollments if _document_needs_updating(enrollment)
        ]

    if len(enrollments) > 0:
        _index_program_enrolled_users(enrollments)

        # Send email for profiles that newly fit the search query for an automatic email
        post_indexing_handler(enrollments)


@app.task
def index_percolate_queries(percolate_query_ids):
    """
    Index percolate queries

    Args:
        percolate_query_ids (iterable of int):
            Database ids for PercolateQuery instances to index
    """
    _index_percolate_queries(PercolateQuery.objects.filter(id__in=percolate_query_ids).exclude(is_deleted=True))


@app.task
def delete_percolate_query(percolate_query_id):
    """
    Delete a percolate query in Elasticsearch

    Args:
        percolate_query_id (int): A PercolateQuery id
    """
    _delete_percolate_query(percolate_query_id)


@app.task
def populate_query_memberships(percolate_query_id):
    """
    Populate existing users to the query's memberships

    Args:
        percolate_query_id (int): Database id for the PercolateQuery to populate
    """
    api.populate_query_memberships(percolate_query_id)
