"""Exam related helpers"""
import logging
import datetime
import re
import pytz

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q

from courses.models import Program
from dashboard.models import (
    CachedEnrollment,
    ProgramEnrollment
)
from dashboard.utils import get_mmtrack
from exams.models import (
    ExamProfile,
    ExamAuthorization
)
from seed_data.utils import add_year


log = logging.getLogger(__name__)
message_not_passed_or_exist_template = '''
[Exam authorization] Unable to authorize user "{user}" for exam,
Course id is "{course_id}". Either user has not passed course or already authorize.
'''
message_not_eligible_template = '''
[Exam authorization] Unable to authorize user "{user}" for exam,
course id is "{course_id}". User does not match the criteria.
'''


def exponential_backoff(retries):
    """
    Exponential backoff for retried tasks

    Args:
        retries (int): cumulative number of retries

    Raises:
        ImproperlyConfigured: if settings.EXAMS_SFTP_BACKOFF_BASE is not a parsable int

    Returns:
        int: seconds to wait until next attempt
    """
    try:
        return int(settings.EXAMS_SFTP_BACKOFF_BASE) ** retries
    except ValueError as ex:
        raise ImproperlyConfigured('EXAMS_SFTP_BACKOFF_BASE must be an integer') from ex


class ExamAuthorizationException(Exception):
    """Exception when exam authorization fail"""
    pass


def is_eligible_for_exam(mmtrack, course_run):
    """
    Returns True if user is eligible exam authorization process. For that the course must have exam
    settings and user must have paid for it.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (courses.models.CourseRun): A CourseRun object.

    Returns:
        bool: whether user is eligible or not
    """
    return course_run.has_exam and _has_paid_for_exam(mmtrack, course_run.edx_course_key)


def _has_paid_for_exam(mmtrack, edx_course_key):
    """
    Returns True if user has paid for the course or payment check is suppressed using feature flag
    FEATURE_SUPPRESS_PAYMENT_FOR_EXAM.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        edx_course_key (str): An edX course key (CourseRun.edx_course_key)

    Returns:
        bool: whether user has paid or not.
    """
    # if FEATURE_SUPPRESS_PAYMENT_FOR_EXAM=True then bypass payment check
    suppress_payment_for_exam = settings.FEATURES.get("SUPPRESS_PAYMENT_FOR_EXAM", False)
    return suppress_payment_for_exam or mmtrack.has_paid(edx_course_key)


def authorize_for_exam(mmtrack, course_run):
    """
    Authorize user for exam if he has paid for course and passed course.

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program.
        course_run (courses.models.CourseRun): A CourseRun object.
    """
    # If exam is not set on selected course then we dont need to process authorization
    if not course_run.has_exam:
        errors_message = message_not_eligible_template.format(
            user=mmtrack.user.username,
            course_id=course_run.edx_course_key
        )
        raise ExamAuthorizationException(errors_message)

    # If user has not paid for course then we dont need to process authorization
    if not _has_paid_for_exam(mmtrack, course_run.edx_course_key):
        errors_message = message_not_eligible_template.format(
            user=mmtrack.user.username,
            course_id=course_run.edx_course_key
        )
        raise ExamAuthorizationException(errors_message)

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

    if not ok_for_authorization:
        errors_message = message_not_passed_or_exist_template.format(
            user=mmtrack.user.username,
            course_id=course_run.edx_course_key
        )
        raise ExamAuthorizationException(errors_message)

    ExamAuthorization.objects.create(
        user=mmtrack.user,
        course=course_run.course,
        date_first_eligible=now,
        date_last_eligible=add_year(now)
    )
    log.info(
        '[Exam authorization] user "%s" is authorize for exam the for course id "%s"',
        mmtrack.user.username,
        course_run.edx_course_key
    )


def bulk_authorize_for_exam(program_id=None, username=None):
    """
    Authorize user(s) for exam(s).

    Args:
        program_id(str): Program id (optional) if you want authorization on specific program exams
        username(str): User name (optional) whom you want to authorize for exam(s)
    """
    programs = Program.objects.filter(
        ~Q(exam_series_code__exact=""),
        live=True,
        exam_series_code__isnull=False
    )
    if program_id is not None:
        programs = programs.filter(id=program_id)

    if not programs.exists():
        if program_id is not None:
            raise ExamAuthorizationException(
                "[Exam authorization] exam_series_code is missing on program='%s'",
                program_id
            )
        else:
            raise ExamAuthorizationException(
                '[Exam authorization] Program(s) are not available for exam authorization.'
            )
        return

    for program in programs:
        authorize_for_exam_given_program(program, username)


def authorize_for_exam_given_program(program, username=None):
    """
    Authorize user(s) for exam on given program.
    Args:
        program(courses.models.Program): Program object.
        username(str): User name (optional) whom you want to authorize for exam(s)
    """
    program_enrollment_qset = ProgramEnrollment.objects.filter(program=program)
    if username is not None:
        program_enrollment_qset = program_enrollment_qset.filter(user__username=username)

    if not program_enrollment_qset.exists():
        if username is not None:
            raise ExamAuthorizationException('[Exam authorization] Invalid username: %s', username)
        else:
            raise ExamAuthorizationException(
                '[Exam authorization] Eligible users do not exist for exam authorization.'
            )
        return

    for program_enrollment in program_enrollment_qset:
        mmtrack = get_mmtrack(
            program_enrollment.user,
            program_enrollment.program
        )
        course_ids = set(mmtrack.edx_key_course_map.values())

        # get latest course_run from given course
        for course_id in course_ids:
            authorize_for_latest_passed_course(mmtrack, course_id)


def authorize_for_latest_passed_course(mmtrack, course_id):
    """
    Authorize user for exam on given course. Using latest passed run.

    Args:
        course_id(int): Course id
        mmtrack (dashboard.utils.MMTrack): An instance of all user information about a program
    """
    enrollments_qset = CachedEnrollment.objects.filter(
        ~Q(course_run__course__exam_module__exact=""),
        course_run__course__exam_module__isnull=False,
        user=mmtrack.user,
        course_run__course__id=course_id,
    ).order_by('-course_run__end_date')

    if not enrollments_qset.exists():
        log.error(
            'Either exam_module is not set for course id="%s" or user="%s" has no enrollment(s)',
            course_id,
            mmtrack.user.username
        )
        return

    for enrollment in enrollments_qset:
        # only latest passed course_run per course allowed
        edx_course_key = enrollment.course_run.edx_course_key
        has_paid_and_passed = (
            mmtrack.has_passed_course(edx_course_key) and
            mmtrack.has_paid(edx_course_key)
        )
        if has_paid_and_passed:
            # if user has passed and paid for the course
            # and not already authorized for exam the create authorizations.
            try:
                authorize_for_exam(mmtrack, enrollment.course_run)
            except ExamAuthorizationException:
                log.exception(
                    'Unable to authorize user: %s for exam on course_id: %s',
                    mmtrack.user.username,
                    enrollment.course_run.course.id
                )
            else:
                break


def _match_field(profile, field):
    """
    If a field is filled out match it to the CP-1252 character set.
    """
    pattern = r'^[\u0020-\u00FF]*$'
    reg = re.compile(pattern)
    value = getattr(profile, field)
    return (True if reg.match(value) else False) if value else False


def validate_profile(profile):
    """
    Make sure all the required fields fall within the CP-1252 character set

    Args:
        profile (Profile): user profile

    Returns:
        bool: whether profile is valid or not
    """
    fields = ['address', 'city', 'state_or_territory', 'country', 'phone_number']
    optional = {'first_name': 'romanized_first_name', 'last_name': 'romanized_last_name'}

    if not _match_field(profile.user, 'email'):
        return False
    for key, value in optional.items():
        if not _match_field(profile, key):
            fields.append(value)
    if profile.country in ('US', 'CA'):
        fields.append('postal_code')

    return all([_match_field(profile, field) for field in fields])
