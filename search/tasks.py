"""
Celery tasks for search
"""
import logging

from django.conf import settings
import celery
from celery.exceptions import Ignore
# The imports which are prefixed with _ are mocked to be ignored in MockedESTestCase

from dashboard.models import ProgramEnrollment
from mail.api import send_automatic_emails as _send_automatic_emails
from micromasters.celery import app
from micromasters.utils import merge_strings, chunks
from search import api
from search.api import (
    document_needs_updating as _document_needs_updating,
    update_percolate_memberships as _update_percolate_memberships,
)
from search.connection import get_conn, make_alias_name
from search.exceptions import ReindexException, RetryException
from search.indexing_api import (
    refresh_all_default_indices as _refresh_all_default_indices,
    index_program_enrolled_users as _index_program_enrolled_users,
    remove_program_enrolled_user as _remove_program_enrolled_user,
    index_percolate_queries as _index_percolate_queries,
    delete_percolate_query as _delete_percolate_query,
    _index_chunks, _get_percolate_documents,
    refresh_index, create_backing_indices, delete_backing_indices,

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


# pylint: disable=inconsistent-return-statements
@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def bulk_index_program_enrollments(program_enrollment_ids, enrollment_public_backing_index,
                                   enrollment_private_backing_index):
    """
    Bulk index user enrollments for provided program enrollment Ids

    Args:
        program_enrollment_ids (list of int) Ids of program enrollments to index
        enrollment_public_backing_index (string): name of public enrollments backing index
        enrollment_private_backing_index (string): name of private enrollments backing index
    """

    try:
        program_enrollments = ProgramEnrollment.objects.filter(id__in=program_enrollment_ids)
        log.info("Indexing %d program enrollments...", program_enrollments.count())
        _index_program_enrolled_users(
            program_enrollments,
            public_indices=[enrollment_public_backing_index],
            private_indices=[enrollment_private_backing_index],
        )
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = "bulk_index_program_enrollments threw an error"
        log.exception(error)
        return error


# pylint: disable=inconsistent-return-statements
@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def bulk_index_percolate_queries(percolate_ids, percolate_backing_index):
    """
    Bulk index percolate queries for provided percolate query Ids

    Args:
        percolate_backing_index (string): name of percolate backing index
        percolate_ids (list of int): Ids of percolates queries to index
    """
    try:
        percolates = PercolateQuery.objects.filter(id__in=percolate_ids).exclude(is_deleted=True)
        log.info("Indexing %d percolator queries...", percolates.count())

        _index_chunks(_get_percolate_documents(percolates.iterator()), index=percolate_backing_index)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = "bulk_index_percolate_queries threw an error"
        log.exception(error)
        return error


@app.task(acks_late=True, bind=True)
def start_recreate_index(self, backing_indices=None):
    """
    Wipe and recreate index and mapping, and index all items.

    Args:
    backing_indices (list of tuple): list of tuples of backing indices for enrollment & percolate queries
    """
    try:
        # Create new backing indices for reindexing if none were provided by caller
        if backing_indices:
            backing_index_tuples = backing_indices
        else:
            backing_index_tuples = create_backing_indices()

        index_tasks = []
        index_tasks = index_tasks + [
            bulk_index_program_enrollments.si(enrollment_ids, backing_index_tuples[0][0], backing_index_tuples[1][0])
            for enrollment_ids in chunks(
                ProgramEnrollment.objects.order_by("id").values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]

        index_tasks = index_tasks + [
            bulk_index_percolate_queries.si(percolate_ids, backing_index_tuples[2][0])
            for percolate_ids in chunks(
                PercolateQuery.objects.order_by("id").values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]

        index_tasks = celery.group(index_tasks)

    except:  # pylint: disable=bare-except
        error = "start_recreate_index threw an error"
        log.exception(error)
        return error

    raise self.replace(
        celery.chain(index_tasks, finish_recreate_index.s(backing_index_tuples))
    )


@app.task
def finish_recreate_index(results, backing_indices):
    """
    Swap and delete reindex backing index with default backing index

    Args:
        results (list or bool): Results saying whether the error exists
        backing_indices (list of tuples): The backing elasticsearch indices tuple
    """
    errors = merge_strings(results)
    if errors:
        delete_backing_indices(backing_indices)
        raise ReindexException(f"Errors occurred during recreate_index: {errors}")
    conn = get_conn(verify=False)

    # Point default alias to new index and delete the old backing index, if any
    log.info("Done with temporary index. Pointing default aliases to newly created backing indexes...")
    for new_backing_index, index_type in backing_indices:
        actions = []
        old_backing_indexes = []
        default_alias = make_alias_name(index_type, is_reindexing=False)
        if conn.indices.exists_alias(name=default_alias):
            # Should only be one backing index in normal circumstances
            old_backing_indexes = list(conn.indices.get_alias(name=default_alias).keys())
            for index in old_backing_indexes:
                actions.append({
                    "remove": {
                        "index": index,
                        "alias": default_alias,
                    }
                })
        actions.append({
            "add": {
                "index": new_backing_index,
                "alias": default_alias,
            },
        })
        conn.indices.update_aliases({
            "actions": actions
        })
        refresh_index(new_backing_index)
        for index in old_backing_indexes:
            conn.indices.delete(index)
    # Remove the temporary backing indices
    delete_backing_indices(backing_indices)
