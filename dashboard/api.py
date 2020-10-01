"""
Apis for the dashboard
"""
import datetime
import logging
from urllib.parse import urljoin
import pytz

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.urls import reverse
from django_redis import get_redis_connection
from edx_api.client import EdxApi

from backends.exceptions import InvalidCredentialStored
from backends import utils
from courses.models import Program, ElectiveCourse
from courses.utils import format_season_year_for_course_run
from dashboard.api_edx_cache import CachedEdxDataApi
from dashboard.utils import get_mmtrack
from financialaid.serializers import FinancialAidDashboardSerializer
from grades import api
from grades.models import FinalGrade
from grades.serializers import ProctoredExamGradeSerializer
from exams.models import ExamAuthorization, ExamRun
from micromasters.utils import now_in_utc
from profiles.api import get_social_auth

# maximum number of exam attempts per payment
ATTEMPTS_PER_PAID_RUN = 2

# key that stores user_key and number of failures in a hash
CACHE_KEY_FAILURE_NUMS_BY_USER = "update_cache_401_failure_numbers"
# key that stores user ids to exclude from cache update
CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE = "failed_cache_update_users_not_to_update"
FIELD_USER_ID_BASE_STR = "user_{0}"

log = logging.getLogger(__name__)

# pylint: disable=too-many-branches


class CourseStatus:
    """
    Possible statuses for a course for a user. These are the course run statuses used in the dashboard API.
    """
    PASSED = 'passed'
    NOT_PASSED = 'not-passed'
    CURRENTLY_ENROLLED = 'currently-enrolled'
    WILL_ATTEND = 'will-attend'
    CAN_UPGRADE = 'can-upgrade'
    MISSED_DEADLINE = 'missed-deadline'
    OFFERED = 'offered'
    PAID_BUT_NOT_ENROLLED = 'paid-but-not-enrolled'

    @classmethod
    def all_statuses(cls):
        """Helper to get all the statuses"""
        return [cls.PASSED, cls.NOT_PASSED, cls.CURRENTLY_ENROLLED, cls.PAID_BUT_NOT_ENROLLED,
                cls.CAN_UPGRADE, cls.OFFERED, cls.WILL_ATTEND, cls.MISSED_DEADLINE, ]


class CourseRunStatus:
    """
    Possible statuses for a course run for a user. These are used internally.
    """
    NOT_ENROLLED = 'not-enrolled'
    CURRENTLY_ENROLLED = 'currently-enrolled'
    CHECK_IF_PASSED = 'check-if-passed'
    WILL_ATTEND = 'will-attend'
    CAN_UPGRADE = 'can-upgrade'
    MISSED_DEADLINE = 'missed-deadline'
    NOT_PASSED = 'not-passed'
    PAID_BUT_NOT_ENROLLED = 'paid-but-not-enrolled'


class CourseFormatConditionalFields:
    """
    The formatting of a course run is dependent
    on the CourseStatus status passed on the function.
    There are some fields that are common and others
    that depend on the status. Also the name of the fields changes.

    This class contains the association between the CourseStatus status
    that need specific fields, the field associated correspondent
    to a course run and the new name they need to have.
    """
    ASSOCIATED_FIELDS = {
        CourseStatus.OFFERED: [
            {
                'course_run_field': 'enrollment_start',
                'format_field': 'enrollment_start_date'
            },
            {
                'course_run_field': 'fuzzy_enrollment_start_date',
                'format_field': 'fuzzy_enrollment_start_date'
            },
        ],
        CourseStatus.CAN_UPGRADE: [
            {
                'course_run_field': 'upgrade_deadline',
                'format_field': 'course_upgrade_deadline'
            },
        ],
        CourseStatus.PAID_BUT_NOT_ENROLLED: [
            {
                'course_run_field': 'enrollment_start',
                'format_field': 'enrollment_start_date'
            },
        ]
    }

    @classmethod
    def get_assoc_field(cls, course_status):
        """
        Method to get from the ASSOCIATED_FIELDS dict
        """
        if course_status not in CourseStatus.all_statuses():
            log.error('%s not defined in Courses.api.CourseStatus', course_status)
            raise ImproperlyConfigured(
                '{} not defined in Courses.api.CourseStatus'.format(course_status))
        return cls.ASSOCIATED_FIELDS.get(course_status, [])


class CourseRunUserStatus:
    """
    Representation of a course run status for a specific user
    """
    def __init__(self, status, course_run=None):
        self.status = status
        self.course_run = course_run

    def __repr__(self):
        return "<CourseRunUserStatus for course {course} status {status} at {address}>".format(
            status=self.status,
            course=self.course_run.title if self.course_run is not None else '"None"',
            address=hex(id(self))
        )


def get_user_program_info(user, edx_client):
    """
    Provides a detailed serialization all of a User's enrolled Programs with enrollment/grade info

    Args:
        user (User): A User
        edx_client (EdxApi): An EdxApi instance

    Returns:
        list: Enrolled Program information
    """
    # update cache
    # NOTE: this part can be moved to an asynchronous task
    if edx_client is not None:
        try:
            for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
                CachedEdxDataApi.update_cache_if_expired(user, edx_client, cache_type)
        except InvalidCredentialStored:
            # this needs to raise in order to force the user re-login
            raise
        except:  # pylint: disable=bare-except
            log.exception('Impossible to refresh edX cache')

    response_data = {
        "programs": [],
        "is_edx_data_fresh": CachedEdxDataApi.are_all_caches_fresh(user)
    }
    all_programs = (
        Program.objects.filter(live=True, programenrollment__user=user).prefetch_related('course_set__courserun_set')
    )
    for program in all_programs:
        mmtrack_info = get_mmtrack(user, program)
        response_data['programs'].append(get_info_for_program(mmtrack_info))
    return response_data


def get_info_for_program(mmtrack):
    """
    Helper function that formats a program with all the courses and runs

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program

    Returns:
        dict: a dictionary containing information about the program
    """
    # basic data for the program
    data = {
        "id": mmtrack.program.pk,
        "description": mmtrack.program.description,
        "title": mmtrack.program.title,
        "financial_aid_availability": mmtrack.financial_aid_available,
        "courses": [],
        "exam_card_status": mmtrack.get_exam_card_status(),
        "grade_average": mmtrack.calculate_final_grade_average(),
        "certificate": mmtrack.get_program_certificate_url(),
        "number_courses_required": (
            mmtrack.program.num_required_courses
            if mmtrack.program.electives_set.exists()
            else mmtrack.program.course_set.count()
        )
    }
    if mmtrack.financial_aid_available:
        data["financial_aid_user_info"] = FinancialAidDashboardSerializer.serialize(mmtrack.user, mmtrack.program)
        data["grade_records_url"] = reverse('grade_records', args=[mmtrack.get_program_enrollment().hash])

    program_letter_url = mmtrack.get_program_letter_url()
    if program_letter_url:
        data["program_letter_url"] = program_letter_url
    for course in mmtrack.program.course_set.all():
        data['courses'].append(
            get_info_for_course(course, mmtrack)
        )
    return data


def get_info_for_course(course, mmtrack):
    """
    Checks the status of a course given the status of all its runs

    Args:
        course (Course): a course object
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program

    Returns:
        dict: dictionary representing the course status for the user
    """
    # pylint: disable=too-many-statements

    # data about the course to be returned anyway
    course_data = {
        "id": course.pk,
        "title": course.title,
        "position_in_program": course.position_in_program,
        "description": course.description,
        "prerequisites": course.prerequisites,
        "has_contact_email": bool(course.contact_email),
        "can_schedule_exam": is_exam_schedulable(mmtrack.user, course),
        "exam_url": get_edx_exam_coupon_url(mmtrack.user, course),
        "exams_schedulable_in_future": get_future_exam_runs(course),
        "past_exam_date": get_past_recent_exam_run(course),
        "has_to_pay": has_to_pay_for_exam(mmtrack, course),
        "runs": [],
        "proctorate_exams_grades": ProctoredExamGradeSerializer(
            mmtrack.get_course_proctorate_exam_results(course), many=True
        ).data,
        "is_elective": ElectiveCourse.objects.filter(course=course).exists(),
        "has_exam": course.has_exam,
        "certificate_url": get_certificate_url(mmtrack, course),
        "overall_grade": mmtrack.get_overall_final_grade_for_course(course)
    }

    def _add_run(run, mmtrack_, status):
        """Helper function to add a course run to the status dictionary"""
        formatted_run = format_courserun_for_dashboard(
            run,
            status,
            mmtrack=mmtrack_,
            position=len(course_data['runs']) + 1
        )
        if run.is_current and mmtrack_.is_enrolled_mmtrack(formatted_run['course_id']):
            # Prepend current run on the top because user can pay and enroll for current run as well as
            # future run and the dashboard UI picks first run to display. User should be able to
            # see current run progress on dashboard UI.
            course_data['runs'] = [formatted_run] + course_data['runs']
        else:
            course_data['runs'].append(formatted_run)

    with transaction.atomic():
        if not course.courserun_set.count():
            return course_data
        # get all the run statuses
        run_statuses = [get_status_for_courserun(course_run, mmtrack)
                        for course_run in course.courserun_set.all()]
    # sort them by end date
    run_statuses.sort(key=lambda x: x.course_run.end_date or
                      datetime.datetime(datetime.MAXYEAR, 1, 1, tzinfo=pytz.utc), reverse=True)
    # pick the first `not enrolled` or the first
    for run_status in run_statuses:
        if run_status.status not in [CourseRunStatus.NOT_ENROLLED, CourseRunStatus.PAID_BUT_NOT_ENROLLED]:
            break
    else:
        run_status = run_statuses[0]
    # remove the picked run_status from the list
    run_statuses.remove(run_status)

    if run_status.status == CourseRunStatus.NOT_ENROLLED:
        next_run = course.first_unexpired_run()
        if next_run is not None:
            _add_run(next_run, mmtrack, CourseStatus.OFFERED)
    elif run_status.status == CourseRunStatus.NOT_PASSED:
        _add_run(run_status.course_run, mmtrack, CourseRunStatus.NOT_PASSED)
        next_run = course.first_unexpired_run()
        if next_run is not None:
            _add_run(next_run, mmtrack, CourseStatus.OFFERED)
    elif run_status.status == CourseRunStatus.MISSED_DEADLINE:
        _add_run(run_status.course_run, mmtrack, CourseStatus.MISSED_DEADLINE)
        next_run = course.first_unexpired_run()
        if next_run is not None:
            _add_run(next_run, mmtrack, CourseStatus.OFFERED)
    elif run_status.status == CourseRunStatus.CURRENTLY_ENROLLED:
        _add_run(run_status.course_run, mmtrack, CourseStatus.CURRENTLY_ENROLLED)
    # check if we need to check the certificate
    elif run_status.status == CourseRunStatus.CHECK_IF_PASSED:
        if not mmtrack.has_passed_course(run_status.course_run.edx_course_key):
            _add_run(run_status.course_run, mmtrack, CourseRunStatus.NOT_PASSED)
        else:
            _add_run(run_status.course_run, mmtrack, CourseStatus.PASSED)

        # we want to return the next run, so the user can re-enroll regardless
        # of whether they passed or failed
        next_run = course.first_unexpired_run()
        if next_run is not None:
            _add_run(next_run, mmtrack, CourseStatus.OFFERED)
    elif run_status.status == CourseRunStatus.WILL_ATTEND:
        _add_run(run_status.course_run, mmtrack, CourseStatus.WILL_ATTEND)
    elif run_status.status == CourseRunStatus.CAN_UPGRADE:
        _add_run(run_status.course_run, mmtrack, CourseStatus.CAN_UPGRADE)
    elif run_status.status == CourseRunStatus.PAID_BUT_NOT_ENROLLED:
        if course.program.financial_aid_availability:
            next_run = course.first_unexpired_run()
            if next_run is not None:
                _add_run(next_run, mmtrack, CourseStatus.PAID_BUT_NOT_ENROLLED)
        else:
            _add_run(run_status.course_run, mmtrack, CourseStatus.PAID_BUT_NOT_ENROLLED)

    # add all the other runs with status != NOT_ENROLLED
    # the first one (or two in some cases) has been added with the logic before
    for run_status in run_statuses:
        if run_status.status == CourseRunStatus.CHECK_IF_PASSED:
            if mmtrack.has_passed_course(run_status.course_run.edx_course_key):
                # in this case the user might have passed the course also in the past
                _add_run(run_status.course_run, mmtrack, CourseStatus.PASSED)
            else:
                # any other status means that the student never passed the course run
                _add_run(run_status.course_run, mmtrack, CourseStatus.NOT_PASSED)
        elif run_status.status == CourseRunStatus.MISSED_DEADLINE:
            _add_run(run_status.course_run, mmtrack, CourseStatus.MISSED_DEADLINE)
        elif run_status.status == CourseRunStatus.CAN_UPGRADE:
            _add_run(run_status.course_run, mmtrack, CourseStatus.CAN_UPGRADE)
        elif run_status.status == CourseRunStatus.CURRENTLY_ENROLLED:
            _add_run(run_status.course_run, mmtrack, CourseStatus.CURRENTLY_ENROLLED)

    return course_data


def get_final_grade(mmtrack, course_run):
    """
    returns final grade if available otherwise freezes the grade.

    Args:
        course_run (CourseRun): a course run
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program

    Returns:
        final_grade: an object representing the FinalGrade
    """
    try:
        final_grade = mmtrack.get_required_final_grade(course_run.edx_course_key)
    except FinalGrade.DoesNotExist:
        # this is a very special case that happens if the user has logged in
        # for the first time after we have already frozen the final grades
        log.warning(
            'The user "%s" doesn\'t have a final grade for the course run "%s" '
            'but the course run has already been frozen. Trying to freeze the user now.',
            mmtrack.user.username,
            course_run.edx_course_key,
        )
        final_grade = api.freeze_user_final_grade(mmtrack.user, course_run, raise_on_exception=True)

    return final_grade


def get_status_for_courserun(course_run, mmtrack):  # pylint: disable=too-many-return-statements 
    """
    Checks the status of a course run for a user given her enrollments

    Args:
        course_run (CourseRun): a course run
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program

    Returns:
        CourseRunUserStatus: an object representing the run status for the user
    """

    if mmtrack.has_paid_final_grade(course_run.edx_course_key):
        return CourseRunUserStatus(CourseRunStatus.CHECK_IF_PASSED, course_run)
    elif mmtrack.has_final_grade(course_run.edx_course_key):
        if course_run.is_upgradable:
            final_grade = get_final_grade(mmtrack, course_run)
            if final_grade.passed:
                return CourseRunUserStatus(CourseRunStatus.CAN_UPGRADE, course_run)
            else:
                return CourseRunUserStatus(CourseRunStatus.NOT_PASSED, course_run)
        else:
            return CourseRunUserStatus(CourseRunStatus.MISSED_DEADLINE, course_run)
    elif not mmtrack.is_enrolled(course_run.edx_course_key):
        if mmtrack.has_paid(course_run.edx_course_key):
            return CourseRunUserStatus(CourseRunStatus.PAID_BUT_NOT_ENROLLED, course_run)
        return CourseRunUserStatus(CourseRunStatus.NOT_ENROLLED, course_run)
    status = None
    if mmtrack.is_enrolled_mmtrack(course_run.edx_course_key):
        if course_run.is_current:
            status = CourseRunStatus.CURRENTLY_ENROLLED
        elif course_run.is_future or course_run.is_promised:
            status = CourseRunStatus.WILL_ATTEND
        # the following statement needs to happen only with the new version of the algorithm
        elif course_run.has_frozen_grades:
            # be sure that the user has a final grade or freeze now
            if not mmtrack.has_final_grade(course_run.edx_course_key):
                api.freeze_user_final_grade(mmtrack.user, course_run, raise_on_exception=True)
            status = CourseRunStatus.CHECK_IF_PASSED
        # this last check needs to be done as last one
        elif course_run.is_past:
            # At this point the course has no frozen final grades yet
            status = CourseRunStatus.CURRENTLY_ENROLLED
        else:
            raise ImproperlyConfigured(
                'The course {0} results are not either current, past, or future at the same time'.format(
                    course_run.edx_course_key
                )
            )
    else:
        if not course_run.is_past:
            if course_run.is_upgradable:
                status = CourseRunStatus.CAN_UPGRADE
            else:
                status = CourseRunStatus.MISSED_DEADLINE
        else:
            if not course_run.is_upgradable:
                status = CourseRunStatus.MISSED_DEADLINE
            else:
                if not course_run.has_frozen_grades:
                    status = CourseRunStatus.CAN_UPGRADE
                else:
                    final_grade = get_final_grade(mmtrack, course_run)
                    if final_grade.passed:
                        status = CourseRunStatus.CAN_UPGRADE
                    else:
                        status = CourseRunStatus.NOT_PASSED

    return CourseRunUserStatus(
        status=status,
        course_run=course_run
    )


def format_courserun_for_dashboard(course_run, status_for_user, mmtrack, position=1):
    """
    Helper function that formats a course run adding informations to the fields coming from the DB

    Args:
        course_run (CourseRun): a course run
        status_for_user (str): a string representing the status of a course for the user
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program
        position (int): The position of the course run within the list

    Returns:
        dict: a dictionary containing information about the course
    """
    if course_run is None:
        return None
    formatted_run = {
        'id': course_run.id,
        'course_id': course_run.edx_course_key,
        'title': course_run.title,
        'status': status_for_user,
        'has_paid': mmtrack.has_paid(course_run.edx_course_key),
        'position': position,
        'course_start_date': course_run.start_date,
        'course_end_date': course_run.end_date,
        'fuzzy_start_date': course_run.fuzzy_start_date,
        'enrollment_url': course_run.enrollment_url,
        'year_season': format_season_year_for_course_run(course_run),
    }

    # check if there are extra fields to pull in
    extra_fields = CourseFormatConditionalFields.get_assoc_field(status_for_user)
    for extra_field in extra_fields:
        formatted_run[extra_field['format_field']] = getattr(course_run, extra_field['course_run_field'])

    if status_for_user in (CourseStatus.PASSED, CourseStatus.NOT_PASSED):
        formatted_run['final_grade'] = mmtrack.get_final_grade_percent(course_run.edx_course_key)
    # if the course is can-upgrade, we need to show the current grade if it is in progress
    # or the final grade if it is final
    elif status_for_user == CourseStatus.CAN_UPGRADE:
        if mmtrack.has_final_grade(course_run.edx_course_key):
            formatted_run['final_grade'] = mmtrack.get_final_grade_percent(course_run.edx_course_key)
        elif course_run.course.should_display_progress:
            formatted_run['current_grade'] = mmtrack.get_current_grade(course_run.edx_course_key)
    # any other status but "offered" should have the current grade
    elif status_for_user != CourseStatus.OFFERED:
        if mmtrack.has_final_grade(course_run.edx_course_key):
            formatted_run['final_grade'] = mmtrack.get_final_grade_percent(course_run.edx_course_key)
        elif course_run.course.should_display_progress:
            formatted_run['current_grade'] = mmtrack.get_current_grade(course_run.edx_course_key)

    return formatted_run


def is_exam_schedulable(user, course):
    """
    Check if a course is ready to schedule an exam or not
    """
    now = now_in_utc()
    schedulable_exam_runs = ExamRun.objects.filter(
        course=course, date_last_eligible__gte=now.date()
    )
    return ExamAuthorization.objects.filter(user=user, exam_run__in=schedulable_exam_runs).exclude(
        operation=ExamAuthorization.OPERATION_DELETE).exists()


def get_edx_exam_coupon_url(user, course):
    """
    Find a successful exam authorization and return the coupon url for the exam

    Args:
        user (User): a user
        course (courses.models.Course): A course

    Returns:
        str: a url to the exam or empty string
    """
    exam_auth = ExamAuthorization.objects.filter(
        user=user, course=course, status=ExamAuthorization.STATUS_SUCCESS
    ).first()
    return exam_auth.exam_coupon_url if exam_auth else ""


def get_future_exam_runs(course):
    """
    Return a list of first dates when exams can be scheduled

    Args:
        course (courses.models.Course): A course

    Returns:
        list(str): a list of dates when future exams become schedulable
    """

    return (ExamRun.get_schedulable_in_future(course).
            order_by('date_first_schedulable').values_list('date_first_schedulable', flat=True))


def get_past_recent_exam_run(course):
    """
    Return scheduling dates for a recent exam, example: 'Mar 7 - Mar 17, 2018'

    Args:
        course (courses.models.Course): A course

    Returns:
        str: a string representation of scheduling window for recent exam run
    """
    exam = ExamRun.get_schedulable_in_past(course).order_by('-date_last_schedulable').first()

    return '{} - {}'.format(
        exam.date_first_schedulable.strftime('%b %-d'), exam.date_last_schedulable.strftime('%b %-d, %Y')
    ) if exam else ''


def has_to_pay_for_exam(mmtrack, course):
    """
    Determine if payment is required for another exam attempt

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program
        course (courses.models.Course): A course
    Returns:
        bool: if the user has to pay for another exam attempt
    """
    attempt_limit = mmtrack.get_payments_count_for_course(course) * ATTEMPTS_PER_PAID_RUN
    return ExamAuthorization.objects.filter(user=mmtrack.user, course=course, exam_taken=True).count() >= attempt_limit


def get_certificate_url(mmtrack, course):
    """
    Find certificate associated with highest passing grade for the course

    Args:
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program
        course (courses.models.Course): A course
    Returns:
        str: url to view the certificate
    """
    url = ""
    best_grade = mmtrack.get_best_final_grade_for_course(course)
    if best_grade:
        course_key = best_grade.course_run.edx_course_key
        if mmtrack.financial_aid_available:
            certificate = mmtrack.get_course_certificate(course)
            if certificate:
                url = reverse('certificate', args=[certificate.hash])
        elif mmtrack.has_passing_certificate(course_key):
            download_url = mmtrack.certificates.get_verified_cert(course_key).download_url
            if download_url:
                url = urljoin(settings.EDXORG_BASE_URL, download_url)
    return url


def calculate_users_to_refresh_in_bulk():
    """
    Calculate the set of user ids which would be updated when running a bulk update. This uses a 6 hour delta
    because this is a bulk operation. For individual updates see CachedEdxDataApi.is_cache_fresh.

    Returns:
        list of int: A list of user ids which need to be updated
    """
    refresh_time_limit = now_in_utc() - datetime.timedelta(hours=6)

    all_users = User.objects.filter(is_active=True, profile__fake_user=False).exclude(social_auth=None)

    con = get_redis_connection("redis")
    user_ids_invalid_credentials = con.smembers(CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE)

    # If one of these fields is null in the database the gte expression will be false, so we will refresh those users
    users_not_expired = all_users.filter(
        usercacherefreshtime__enrollment__gte=refresh_time_limit,
        usercacherefreshtime__certificate__gte=refresh_time_limit,
        usercacherefreshtime__current_grade__gte=refresh_time_limit
    )

    return list(
        all_users
        .exclude(id__in=users_not_expired.values_list("id", flat=True))
        .exclude(id__in=user_ids_invalid_credentials)
        .values_list("id", flat=True)
    )


def refresh_user_data(user_id):
    """
    Refresh the edx cache data for a user.

    Note that this function will not raise an exception on error, instead the errors are logged.

    Args:
        user_id (int): The user id
    """
    # pylint: disable=bare-except
    try:
        user = User.objects.get(pk=user_id)
    except:
        log.exception('edX data refresh task: unable to get user "%s"', user_id)
        return

    # get the credentials for the current user for edX
    try:
        user_social = get_social_auth(user)
    except:
        log.exception('user "%s" does not have edX credentials', user.username)
        return

    try:
        utils.refresh_user_token(user_social)
    except:
        save_cache_update_failure(user_id)
        log.exception("Unable to refresh token for student %s", user.username)
        return

    try:
        edx_client = EdxApi(user_social.extra_data, settings.EDXORG_BASE_URL)
    except:
        log.exception("Unable to create an edX client object for student %s", user.username)
        return

    for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
        try:
            CachedEdxDataApi.update_cache_if_expired(user, edx_client, cache_type)
        except:
            save_cache_update_failure(user_id)
            log.exception("Unable to refresh cache %s for student %s", cache_type, user.username)
            continue


def save_cache_update_failure(user_id):
    """
    Store the number of time update cache failed for a user

    Args:
        user_id (int): The user id
    """
    con = get_redis_connection("redis")
    user_key = FIELD_USER_ID_BASE_STR.format(user_id)
    new_value = con.hincrby(CACHE_KEY_FAILURE_NUMS_BY_USER, user_key, 1)
    if int(new_value) >= 3:
        con.sadd(CACHE_KEY_FAILED_USERS_NOT_TO_UPDATE, user_id)
