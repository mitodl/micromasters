"""
API for exams app
"""
import logging
import hashlib

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q

from dashboard.utils import get_mmtrack
from dashboard.api import has_to_pay_for_exam
from exams.exceptions import ExamAuthorizationException
from exams.models import (
    ExamAuthorization,
    ExamProfile,
    ExamRun,
)
from grades.models import FinalGrade
from grades.constants import FinalGradeStatus
from micromasters.utils import now_in_utc

MESSAGE_NOT_PASSED_OR_EXIST_TEMPLATE = (
    '[Exam authorization] Unable to authorize user "{user}" for exam, '
    'course id is "{course_id}". Either user has not passed course or already authorized.'
)
MESSAGE_NOT_ELIGIBLE_TEMPLATE = (
    '[Exam authorization] Unable to authorize user "{user}" for exam, '
    'course id is "{course_id}". User does not match the criteria.'
)
MESSAGE_NO_ATTEMPTS_TEMPLATE = (
    '[Exam authorization] Unable to authorize user "{user}" for exam, '
    'course id is "{course_id}". No attempts remaining.'
)


log = logging.getLogger(__name__)


def sso_digest(client_candidate_id, timestamp, session_timeout):
    """
    Compute the sso_digest value we need to send to pearson

    Args:
        client_candidate_id (int|str): id for the user, usually Profile.student_id
        timestamp (int): unix timestamp
        session_timeout (int): number of seconds the session will last

    Returns:
        str: the computed digest value
    """
    if settings.EXAMS_SSO_PASSPHRASE is None:
        raise ImproperlyConfigured("EXAMS_SSO_PASSPHRASE is not configured")
    if settings.EXAMS_SSO_CLIENT_CODE is None:
        raise ImproperlyConfigured("EXAMS_SSO_CLIENT_CODE is not configured")

    data = ''.join([
        settings.EXAMS_SSO_PASSPHRASE,
        settings.EXAMS_SSO_CLIENT_CODE,
        str(timestamp),
        str(session_timeout),
        str(client_candidate_id),
    ]).encode('iso-8859-1')
    return hashlib.sha256(data).hexdigest()


def authorize_for_exam_run(user, course_run, exam_run):
    """
    Authorize user for exam if he has paid for course and passed course.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (courses.models.CourseRun): A CourseRun object.
        exam_run (exams.models.ExamRun): the ExamRun we're authorizing for
    """

    mmtrack = get_mmtrack(user, course_run.course.program)
    if not mmtrack.user.is_active:
        raise ExamAuthorizationException(
            "Inactive user '{}' cannot be authorized for the exam for course id '{}'".format(
                mmtrack.user.username,
                course_run.course
            )
        )
    if course_run.course != exam_run.course:
        raise ExamAuthorizationException(
            "Course '{}' on CourseRun doesn't match Course '{}' on ExamRun".format(course_run.course, exam_run.course)
        )
    if not exam_run.is_schedulable:
        raise ExamAuthorizationException("Exam isn't schedulable currently: {}".format(exam_run))

    # If user has not paid for course then we dont need to process authorization
    if not mmtrack.has_paid(course_run.edx_course_key):
        errors_message = MESSAGE_NOT_ELIGIBLE_TEMPLATE.format(
            user=mmtrack.user.username,
            course_id=course_run.edx_course_key
        )
        raise ExamAuthorizationException(errors_message)

    # if user paid for a course then create his exam profile if it is not created yet
    ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)

    # if they didn't pass, they don't get authorized
    if not mmtrack.has_passed_course(course_run.edx_course_key):
        errors_message = MESSAGE_NOT_PASSED_OR_EXIST_TEMPLATE.format(
            user=mmtrack.user.username,
            course_id=course_run.edx_course_key
        )
        raise ExamAuthorizationException(errors_message)

    # if they have run out of attempts, they don't get authorized
    if has_to_pay_for_exam(mmtrack, course_run.course):
        errors_message = MESSAGE_NO_ATTEMPTS_TEMPLATE.format(
            user=mmtrack.user.username,
            course_id=course_run.edx_course_key
        )
        raise ExamAuthorizationException(errors_message)

    ExamAuthorization.objects.get_or_create(
        user=mmtrack.user,
        course=course_run.course,
        exam_run=exam_run,
    )
    log.info(
        '[Exam authorization] user "%s" is authorized for the exam for course id "%s"',
        mmtrack.user.username,
        course_run.edx_course_key
    )


def authorize_for_latest_passed_course(user, exam_run):
    """
    This walks the FinalGrade backwards chronologically and authorizes the first eligible one.

    Args:
        mmtrack (dashboard.utils.MMTrack): An instance of all user information about a program
        exam_run (exams.models.ExamRun): the ExamRun to authorize the learner for
    """
    final_grades = FinalGrade.objects.filter(
        user=user,
        passed=True,
        status=FinalGradeStatus.COMPLETE,
        course_run__course__id=exam_run.course_id,
    ).order_by('-course_run__end_date')

    if not final_grades.exists():
        return

    for final_grade in final_grades:
        try:
            authorize_for_exam_run(user, final_grade.course_run, exam_run)
        except ExamAuthorizationException:
            log.debug(
                'Unable to authorize user: %s for exam on course_id: %s',
                user.username,
                final_grade.course_run.course.id
            )
        else:
            break


def authorize_user_for_schedulable_exam_runs(user, course_run):
    """
    Authorizes a user for all schedulable ExamRuns for a CourseRun

    Args:
        user (django.contib.auth.models.User): the user to authorize
        course_run (courses.models.CourseRun): the course run to check
    """

    # for each ExamRun for this course that is currently schedulable, attempt to authorize the user
    for exam_run in ExamRun.get_currently_schedulable(course_run.course):
        try:
            authorize_for_exam_run(user, course_run, exam_run)
        except ExamAuthorizationException:
            log.debug(
                'Unable to authorize user: %s for exam on course_id: %s',
                user.username,
                course_run.course.id
            )


def update_authorizations_for_exam_run(exam_run):
    """
    Updates outstanding exam authorizations so we send them to Pearson with new data

    Args:
        exam_run(exams.models.ExamRun): the ExamRun that updated
    """
    if not exam_run.is_schedulable:
        return

    # Update all existing auths to pending
    ExamAuthorization.objects.filter(exam_run=exam_run).exclude(
        Q(status=ExamAuthorization.STATUS_PENDING) | Q(exam_taken=True)
    ).update(
        status=ExamAuthorization.STATUS_PENDING,
        operation=ExamAuthorization.OPERATION_UPDATE,
        updated_on=now_in_utc()
    )
