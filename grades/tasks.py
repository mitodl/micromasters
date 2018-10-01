"""
Tasks for the grades app
"""
import logging

from celery import group
from celery.result import GroupResult
from django.contrib.auth.models import User
from django.core.cache import caches
from django.db import IntegrityError
from django.db.models import OuterRef, Exists
from django_redis import get_redis_connection

from courses.models import CourseRun, Course
from grades import api
from grades.constants import FinalGradeStatus
from grades.models import (
    FinalGrade,
    ProctoredExamGrade,
    MicromastersCourseCertificate,
    CourseRunGradingStatus,
    CombinedFinalGrade,
)
from micromasters.celery import app
from micromasters.utils import chunks, now_in_utc

CACHE_ID_BASE_STR = "freeze_grade_{0}"

log = logging.getLogger(__name__)
cache_redis = caches['redis']


@app.task
def generate_course_certificates_for_fa_students():
    """
    Creates any missing unique course-user FACourseCertificates
    """
    courses = Course.objects.filter(
        program__live=True,
        program__financial_aid_availability=True
    )
    for course in courses:
        if not course.has_frozen_runs():
            continue

        course_certificates = MicromastersCourseCertificate.objects.filter(
            course=course,
            user=OuterRef('user')
        )
        # Find users that passed the course but don't have a certificate yet
        users_need_cert = FinalGrade.objects.annotate(
            course_certificate=Exists(course_certificates)
        ).filter(
            course_run__course=course,
            status=FinalGradeStatus.COMPLETE,
            passed=True,
            course_certificate=False
        ).values_list('user', flat=True)

        if course.has_exam:
            # need also to pass exam
            users_need_cert = ProctoredExamGrade.objects.filter(
                course=course,
                passed=True,
                exam_run__date_grades_available__lte=now_in_utc(),
                user__in=users_need_cert
            ).values_list('user', flat=True)

        for user in users_need_cert:
            try:
                MicromastersCourseCertificate.objects.get_or_create(
                    user_id=user,
                    course=course
                )
            except (IntegrityError, MicromastersCourseCertificate.DoesNotExist):
                log.exception(
                    "Unable to fetch or create certificate for user id: %d and course: %s",
                    user,
                    course.title
                )


@app.task
def create_combined_final_grades():
    """
    Creates any missing CombinedFinalGrades
    """
    courses = Course.objects.filter(
        program__live=True,
        program__financial_aid_availability=True
    )
    for course in courses:
        if course.has_frozen_runs() and course.has_exam:
            exam_grades = ProctoredExamGrade.objects.filter(
                course=course,
                passed=True,
                exam_run__date_grades_available__lte=now_in_utc()
            )
            users_with_grade = set(CombinedFinalGrade.objects.filter(course=course).values_list('user', flat=True))
            for exam_grade in exam_grades:
                if exam_grade.user.id not in users_with_grade:
                    api.update_or_create_combined_final_grade(exam_grade.user, course)


@app.task
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


@app.task
def freeze_course_run_final_grades(course_run_id):
    """
    Async task manager to freeze all the users' final grade in a course run

    Args:
        course_run_id (int): a course run id

    Returns:
        None
    """
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
        results = GroupResult.restore(group_results_id, app=app)
        # if the subtasks are not done, revoke them
        results.revoke()
        # delete the results anyway
        results.delete()

    # extract the users to be frozen for this course
    user_ids_qset = api.get_users_without_frozen_final_grade(course_run).values_list('id', flat=True)

    # find number of users for which cache could not be updated
    con = get_redis_connection("redis")
    failed_users_cache_key = api.CACHE_KEY_FAILED_USERS_BASE_STR.format(course_run.edx_course_key)
    failed_users_count = con.llen(failed_users_cache_key)

    # get the list of users that failed authentication last run of the task
    failed_users_list = list(map(int, con.lrange(failed_users_cache_key, 0, failed_users_count)))
    users_need_freeze = list(user_ids_qset)
    users_left = list(set(users_need_freeze) - set(failed_users_list))
    # if there are no more users to be frozen, just complete the task
    if not users_left:
        log.info('Completing grading with %d users getting refresh cache errors', len(failed_users_list))
        CourseRunGradingStatus.set_to_complete(course_run)
        con.delete(failed_users_cache_key)
        return

    # if the task reaches this point, it means there are users still to be processed

    # clear the list for users for whom cache update failed
    con.delete(failed_users_cache_key)
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


@app.task
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
    course_run = CourseRun.objects.get(id=course_run_id)
    for user in User.objects.filter(id__in=user_ids):
        try:
            api.freeze_user_final_grade(user, course_run)
        except:
            log.exception(
                'Impossible to freeze final grade for user "%s" in course %s',
                user.username, course_run.edx_course_key
            )
