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


def authorize_for_exam(mmtrack, course_run):
    """
    Authorize user for exam if he has paid for course and passed course.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (CourseRun): A CourseRun object.
    """
    ok_for_exam = (
        course_run and
        course_run.edx_course_key and
        course_run.course and
        course_run.course.exam_module and
        mmtrack.program.exam_series_code and
        mmtrack.has_paid(course_run.edx_course_key)
    )

    if ok_for_exam:
        now = datetime.datetime.now(tz=pytz.UTC)
        # if user paid for a course then create his exam profile if it is not creaated yet.
        ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)

        # if user passed the course and currently not authorization for that run then give
        # her authorizations.
        ok_for_authorization = (
            mmtrack.has_passed_course(course_run.edx_course_key) and
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
