"""Exam related helpers"""
import logging
import datetime

from dashboard.api_edx_cache import CachedEdxUserData
from dashboard.utils import MMTrack
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from seed_data.utils import add_year


log = logging.getLogger(__name__)


def get_mmtrack(user, program):
    """
    Creates mmtack object for given user.

    Args:
        user (User): a Django user.
        program (programs.models.Program): program where the user is enrolled.

    Returns:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program
    """
    edx_user_data = CachedEdxUserData(user, program=program)
    return MMTrack(
        user,
        program,
        edx_user_data
    )


def exam_authorization(mmtrack, course_run):
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
        mmtrack.has_passed_course(course_run.edx_course_key) and
        mmtrack.has_paid(course_run.edx_course_key) and
        not ExamAuthorization.objects.filter(user=mmtrack.user, course=course_run.course).exists()
    )

    if ok_for_exam:
        exam_profile, created = ExamProfile.objects.get_or_create(profile=mmtrack.user.profile)

        if created or exam_profile.status != ExamProfile.PROFILE_SUCCESS:
            ExamProfile.objects.filter(profile=mmtrack.user.profile).update(status=ExamProfile.PROFILE_SUCCESS)

        ExamAuthorization.objects.create(
            user=mmtrack.user,
            course=course_run.course,
            date_first_eligible=datetime.datetime.now(),
            date_last_eligible=add_year(datetime.datetime.now())
        )
        log.info(
            'user "%s" is authorize for exam the for course id "%s"',
            mmtrack.user.username,
            course_run.edx_course_key
        )
