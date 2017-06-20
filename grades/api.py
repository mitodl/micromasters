"""
APIs for the grades app
"""
import logging
from collections import namedtuple

from django.contrib.auth.models import User

from dashboard.api_edx_cache import CachedEdxUserData, CachedEdxDataApi
from dashboard.models import CachedEnrollment
from grades.exceptions import FreezeGradeFailedException
from grades.models import (
    FinalGrade,
    FinalGradeStatus,
)


log = logging.getLogger(__name__)

UserFinalGrade = namedtuple('UserFinalGrade', ['grade', 'passed', 'payed_on_edx'])


def _compute_grade_for_fa(user_edx_run_data):
    """
    Gets the final grade for an user enrolled in the course run that is part of a financial aid program.

    Args:
        user_edx_run_data (dashboard.api_edx_cache.UserCachedRunData): the edx cached data for an user in a course run

    Returns:
        UserFinalGrade: a namedtuple of (float, bool,) representing the final grade
            of the user in the course run and whether she passed it
    """
    run_passed = None
    grade = None
    if user_edx_run_data.certificate is not None:
        run_passed = user_edx_run_data.certificate.status == 'downloadable'
        grade = user_edx_run_data.certificate.grade
        # the following line should be updated when
        # we add support for honor enrollments and certificates in the edx-api-client
        payed_on_edx = user_edx_run_data.certificate.certificate_type in ['honor', 'verified']
    else:
        run_passed = user_edx_run_data.current_grade.passed
        grade = user_edx_run_data.current_grade.percent
        payed_on_edx = False
    # making sure the grade is a float
    try:
        grade = float(grade)
    except (ValueError, TypeError):
        grade = 0.
    return UserFinalGrade(grade=grade, passed=run_passed, payed_on_edx=payed_on_edx)


def _compute_grade_for_non_fa(user_edx_run_data):
    """
    Gets the final grade for an user enrolled in the
    course run that is part of a non financial aid program.
    If the user has a certificate, she has passed otherwise she has not.

    Args:
        user_edx_run_data (dashboard.api_edx_cache.UserCachedRunData): the edx cached data for an user in a course run

    Returns:
        UserFinalGrade: a namedtuple of (float, bool,) representing the final grade
            of the user in the course run and whether she passed it
    """
    if user_edx_run_data.certificate is not None:
        run_passed = user_edx_run_data.certificate.status == 'downloadable'
        grade = user_edx_run_data.certificate.grade
        payed_on_edx = user_edx_run_data.certificate.certificate_type in ['honor', 'verified']
    else:
        run_passed = False
        grade = user_edx_run_data.current_grade.percent
        payed_on_edx = user_edx_run_data.enrollment.mode in ['honor', 'verified']
    # making sure the grade is a float
    try:
        grade = float(grade)
    except (ValueError, TypeError):
        grade = 0.
    return UserFinalGrade(grade=grade, passed=run_passed, payed_on_edx=payed_on_edx)


def _get_compute_func(course_run):
    """
    Gets the proper function to compute the final grade.

    Currently this implements a very simple logic, but it seems that
    in the near future we could have policies to compute the final grade
    that can be different per program (run?).

    Args:
        course_run (CourseRun): a course run model object

    Returns:
        function: a function to be called to compute the final grade
    """
    return _compute_grade_for_fa if course_run.course.program.financial_aid_availability else _compute_grade_for_non_fa


def get_final_grade(user, course_run):
    """
    Public function to compute final grades for the a user in a course run.

    Args:
        user (User): a django User
        course_run (CourseRun): a course run model object

    Returns:
        UserFinalGrade: a namedtuple of (grade, passed,) representing the final grade
            of the user in the course run and whether she passed it
    """
    # pull the cached data for the user
    user_data = CachedEdxUserData(user, course_run.course.program)
    run_data = user_data.get_run_data(course_run.edx_course_key)
    # pick the right function
    final_grade_func = _get_compute_func(course_run)
    return final_grade_func(run_data)


def get_users_without_frozen_final_grade(course_run):
    """
    Public function to extract all the users that need a final grade freeze for a course run.
    All the users that are enrolled in a course run must have frozen final grade.

    Args:
        course_run (CourseRun): a course run model object

    Returns:
        queryset: a queryset of users
    """
    # get the list of users enrolled in the course
    users_in_cache = set(CachedEnrollment.get_cached_users(course_run))
    # get all the users with already frozen final grade
    users_already_processed = set(FinalGrade.get_frozen_users(course_run))
    return User.objects.filter(pk__in=users_in_cache.difference(users_already_processed))


def freeze_user_final_grade(user, course_run, raise_on_exception=False):
    """
    Public function to freeze final grades for the a user in a course run.

    Args:
        user (User): a django User
        course_run (CourseRun): a course run model object

    Returns:
        None
    """
    # no need to do anything if the course run is not ready
    if not course_run.can_freeze_grades:
        if not raise_on_exception:
            log.info(
                'The grade for user "%s" course "%s" cannot be frozen yet',
                user.username, course_run.edx_course_key
            )
            return
        else:
            raise FreezeGradeFailedException(
                'The grade for user "{0}" course "{1}" cannot be frozen yet'.format(
                    user.username,
                    course_run.edx_course_key,
                )
            )
    # update one last time the user's certificates and current grades
    try:
        CachedEdxDataApi.update_all_cached_grade_data(user)
    except Exception as ex:  # pylint: disable=broad-except
        if not raise_on_exception:
            log.exception('Impossible to refresh the edX cache for user "%s"', user.username)
            return
        else:
            raise FreezeGradeFailedException(
                'Impossible to refresh the edX cache for user "{0}"'.format(user.username)) from ex
    # get the final grade for the user in the program
    try:
        final_grade = get_final_grade(user, course_run)
    except Exception as ex:  # pylint: disable=broad-except
        if not raise_on_exception:
            log.exception(
                'Impossible to get final grade for user "%s" in course %s', user.username, course_run.edx_course_key)
            return
        else:
            raise FreezeGradeFailedException(
                'Impossible to get final grade for user "{0}" in course {1}'.format(
                    user.username,
                    course_run.edx_course_key
                )
            ) from ex
    # the final grade at this point should not exists, but putting a `get_or_create`
    # should solve the problem when the function is called synchronously from the dashboard REST API multiple times
    final_grade_obj, _ = FinalGrade.objects.get_or_create(
        user=user,
        course_run=course_run,
        grade=final_grade.grade,
        passed=final_grade.passed,
        status=FinalGradeStatus.COMPLETE,
        course_run_paid_on_edx=final_grade.payed_on_edx
    )
    return final_grade_obj
