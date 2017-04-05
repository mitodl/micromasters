"""
Tasks for the course app
"""
import logging

from celery import group
from celery.result import GroupResult
from django.contrib.auth.models import User
from django.core.cache import caches

from courses.models import CourseRun
from grades import api
from grades.models import CourseRunGradingStatus
from micromasters.celery import async
from micromasters.utils import chunks
from search.tasks import lookup_id


CACHE_ID_BASE_STR = "freeze_grade_{0}"

log = logging.getLogger(__name__)
cache_redis = caches['redis']


@async.task
def find_course_runs_and_freeze_grades():
    """
    Async task that takes care of finding all the course
    runs that can freeze the final grade to their students.

    Args:
        None

    Returns:
        None
    """
    runs_to_freeze = CourseRun.get_freezable()
    for run in runs_to_freeze:
        freeze_course_run_final_grades.delay(run.id)


@async.task
def freeze_course_run_final_grades(course_run_id):
    """
    Async task manager to freeze all the users' final grade in a course run

    Args:
        course_run_id (int): a course run id

    Returns:
        None
    """
    # Deprecated! lookup_id is used to handle queued tasks at the time of deployment
    # In the near future course_run_id will always be an integer
    course_run_id = lookup_id(course_run_id)
    course_run = CourseRun.objects.get(id=course_run_id)
    # no need to do anything if the course run is not ready
    if not course_run.can_freeze_grades:
        log.info('the grades course "%s" cannot be frozen yet', course_run.edx_course_key)
        return

    # if it has already completed, do not do anything
    if CourseRunGradingStatus.is_complete(course_run):
        log.info('Final Grades freezing for course run "%s" has already been completed', course_run.edx_course_key)
        return

    # cache id string for this task
    cache_id = CACHE_ID_BASE_STR.format(course_run.edx_course_key)

    # try to get the result id from a previous iteration of this task for this course run
    group_results_id = cache_redis.get(cache_id)

    # if the id is not none, it means that this task already run before for this course run
    # so we need to check if its subtasks have finished
    if group_results_id is not None:
        # delete the entry from the cache (if needed it will be added again later)
        cache_redis.delete(cache_id)
        # extract the results from the id
        results = GroupResult.restore(group_results_id)
        # if the subtasks are not done, revoke them
        if not results.ready():
            log.error('freezing of users for course %s took more than one iteration', course_run.edx_course_key)
            results.revoke()
        # delete the results anyway
        results.delete()

    # extract the users to be frozen for this course
    user_ids_qset = api.get_users_without_frozen_final_grade(course_run).values_list('id', flat=True)

    # if there are no more users to be froze, just complete the task
    if not user_ids_qset.exists():
        CourseRunGradingStatus.set_to_complete(course_run)
        return

    # if the task reaches this point, it means there are users still to be processed

    # create an entry in with pending status ('pending' is the default status)
    CourseRunGradingStatus.create_pending(course_run=course_run)

    # create a group of subtasks to be run in parallel
    job = group(
        freeze_users_final_grade_async.s(list_user_ids, course_run.id) for list_user_ids in chunks(user_ids_qset)
    )
    results = job.apply_async()
    # save the result ID in the celery backend
    results.save()
    # put the results id in the cache to be retrieved and finalized later
    cache_redis.set(cache_id, results.id, None)


@async.task
def freeze_users_final_grade_async(user_ids, course_run_id):
    """
    Async task to freeze the final grade in a course run for a list of users.

    Args:
        user_ids (list): a list of django user ids
        course_run_id (int): a course run id

    Returns:
        None
    """
    # pylint: disable=bare-except
    # Deprecated! lookup_id is used to handle queued tasks at the time of deployment
    # In the near future course_run_id will always be an integer
    course_run_id = lookup_id(course_run_id)
    course_run = CourseRun.objects.get(id=course_run_id)
    for user in User.objects.filter(id__in=user_ids):
        try:
            api.freeze_user_final_grade(user, course_run)
        except:
            log.exception(
                'Impossible to freeze final grade for user "%s" in course %s',
                user.username, course_run.edx_course_key
            )
