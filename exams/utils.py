"""Exam related helpers"""
import logging
import datetime
import pytz

from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from seed_data.utils import add_year


log = logging.getLogger(__name__)


def course_has_exam(mmtrack, course_run):
    """
    Check if the user is authorized for an exam for a course run
    """
    return bool(
        course_run and
        course_run.edx_course_key and
        course_run.course and
        course_run.course.exam_module and
        mmtrack.program.exam_series_code
    )


def is_eligible_for_exam(mmtrack, course_run):
    """
    Returns True if user is eligible exam authorization process. For that the course must have exam
    settings and user must have paid for it.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (courses.models.CourseRun): A CourseRun object.

    Returns:
        bool: whether use is eligible or not
    """
    return course_has_exam(mmtrack, course_run) and mmtrack.has_paid(course_run.edx_course_key)


def authorize_for_exam(mmtrack, course_run):
    """
    Authorize user for exam if he has paid for course and passed course.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (courses.models.CourseRun): A CourseRun object.
    """
    if is_eligible_for_exam(mmtrack, course_run):
        now = datetime.datetime.now(tz=pytz.UTC)
        # if user paid for a course then create his exam profile if it is not creaated yet.
        ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)

        # if user passed the course and currently not authorization for that run then give
        # her authorizations.
        try:
            passed = mmtrack.has_passed_course(course_run.edx_course_key)
        except:  # pylint: disable=bare-except
            log.exception(
                'Unable to check if user %s passed course %s',
                mmtrack.user.username,
                course_run.edx_course_key
            )
            return
        ok_for_authorization = (
            passed and
            not ExamAuthorization.objects.filter(
                user=mmtrack.user,
                course=course_run.course,
                date_first_eligible__lte=now,
                date_last_eligible__gte=now
            ).exists()
        )

        if ok_for_authorization:
            ExamAuthorization.objects.create(
                user=mmtrack.user,
                course=course_run.course,
                date_first_eligible=now,
                date_last_eligible=add_year(now)
            )
            log.info(
                'user "%s" is authorize for exam the for course id "%s"',
                mmtrack.user.username,
                course_run.edx_course_key
            )
