"""
API for exams app
"""
import logging

from dashboard.utils import get_mmtrack
from exams.exceptions import ExamAuthorizationException
from exams.models import ExamAuthorization, ExamProfile, ExamRun
from grades.constants import FinalGradeStatus
from grades.models import FinalGrade

MESSAGE_NOT_PASSED_OR_EXIST_TEMPLATE = (
    '[Exam authorization] Unable to authorize user "{user}" for exam, '
    'course id is "{course_id}". Either user has not passed course or already authorized.'
)
MESSAGE_NO_ATTEMPTS_TEMPLATE = (
    '[Exam authorization] Unable to authorize user "{user}" for exam, '
    'course id is "{course_id}". No attempts remaining.'
)


log = logging.getLogger(__name__)


def authorize_for_exam_run(user, course_run, exam_run):
    """
    Authorize user for an exam if they are eligible and have passed the course.

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
            f"Course '{course_run.course}' on CourseRun doesn't match Course '{exam_run.course}' on ExamRun"
        )
    if not exam_run.is_schedulable:
        raise ExamAuthorizationException(f"Exam isn't schedulable currently: {exam_run}")

    # ensure an exam profile exists for this user
    ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)

    # if they didn't pass, they don't get authorized
    if not mmtrack.has_passed_course_run(course_run.edx_course_key):
        errors_message = MESSAGE_NOT_PASSED_OR_EXIST_TEMPLATE.format(
            user=mmtrack.user.username,
            course_id=course_run.edx_course_key
        )
        raise ExamAuthorizationException(errors_message)

    ExamAuthorization.objects.get_or_create(
        user=mmtrack.user,
        course=course_run.course,
        exam_run=exam_run,
        status=ExamAuthorization.STATUS_SUCCESS,
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
