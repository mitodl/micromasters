"""
Apis for the dashboard
"""
import datetime
import logging

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
import pytz

from courses.models import Program
from dashboard.api_edx_cache import CachedEdxDataApi, CachedEdxUserData
from dashboard.utils import MMTrack

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

    @classmethod
    def all_statuses(cls):
        """Helper to get all the statuses"""
        return [cls.PASSED, cls.NOT_PASSED, cls.CURRENTLY_ENROLLED,
                cls.CAN_UPGRADE, cls.OFFERED, cls.WILL_ATTEND, cls.MISSED_DEADLINE]


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
    for cache_type in CachedEdxDataApi.SUPPORTED_CACHES:
        CachedEdxDataApi.update_cache_if_expired(user, edx_client, cache_type)

    edx_user_data = CachedEdxUserData(user)

    response_data = []
    all_programs = (
        Program.objects.filter(live=True, programenrollment__user=user).prefetch_related('course_set__courserun_set')
    )
    for program in all_programs:
        mmtrack_info = MMTrack(
            user,
            program,
            edx_user_data
        )
        response_data.append(get_info_for_program(mmtrack_info))
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
    }
    if mmtrack.financial_aid_available:
        data["financial_aid_user_info"] = {
            "id": mmtrack.financial_aid_id,
            "has_user_applied": mmtrack.financial_aid_applied,
            "application_status": mmtrack.financial_aid_status,
            "min_possible_cost": mmtrack.financial_aid_min_price,
            "max_possible_cost": mmtrack.financial_aid_max_price,
            "date_documents_sent": mmtrack.financial_aid_date_documents_sent,
        }
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
        "runs": [],
    }

    def _add_run(run, mmtrack_, status):
        """Helper function to add a course run to the status dictionary"""
        course_data['runs'].append(
            format_courserun_for_dashboard(
                run,
                status,
                mmtrack=mmtrack_,
                position=len(course_data['runs']) + 1
            )
        )

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
        if run_status.status != CourseRunStatus.NOT_ENROLLED:
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
        # if the user never passed the course she needs to enroll in the next one
        if not mmtrack.has_passed_course(run_status.course_run.edx_course_key):
            _add_run(run_status.course_run, mmtrack, CourseRunStatus.NOT_PASSED)
            next_run = course.first_unexpired_run()
            if next_run is not None:
                _add_run(next_run, mmtrack, CourseStatus.OFFERED)
        else:
            _add_run(run_status.course_run, mmtrack, CourseStatus.PASSED)
    elif run_status.status == CourseRunStatus.WILL_ATTEND:
        _add_run(run_status.course_run, mmtrack, CourseStatus.WILL_ATTEND)
    elif run_status.status == CourseRunStatus.CAN_UPGRADE:
        _add_run(run_status.course_run, mmtrack, CourseStatus.CAN_UPGRADE)

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

    return course_data


def get_status_for_courserun(course_run, mmtrack):
    """
    Checks the status of a course run for a user given her enrollments

    Args:
        course_run (CourseRun): a course run
        mmtrack (dashboard.utils.MMTrack): a instance of all user information about a program

    Returns:
        CourseRunUserStatus: an object representing the run status for the user
    """
    if not mmtrack.is_enrolled(course_run.edx_course_key):
        return CourseRunUserStatus(CourseRunStatus.NOT_ENROLLED, course_run)
    status = None
    if mmtrack.is_enrolled_mmtrack(course_run.edx_course_key):
        if course_run.is_current:
            status = CourseRunStatus.CURRENTLY_ENROLLED
        elif course_run.is_past:
            status = CourseRunStatus.CHECK_IF_PASSED
        elif course_run.is_future:
            status = CourseRunStatus.WILL_ATTEND
        # If a course run has no start or end date, is_past, is_current, and is_future all return False
    else:
        if course_run.is_past:
            status = CourseRunStatus.NOT_PASSED
        else:
            if course_run.is_upgradable:
                status = CourseRunStatus.CAN_UPGRADE
            else:
                status = CourseRunStatus.MISSED_DEADLINE
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
        return
    formatted_run = {
        'id': course_run.id,
        'course_id': course_run.edx_course_key,
        'title': course_run.title,
        'status': status_for_user,
        'position': position,
        'course_start_date': course_run.start_date,
        'course_end_date': course_run.end_date,
        'fuzzy_start_date': course_run.fuzzy_start_date,
        'enrollment_url': course_run.enrollment_url,
    }

    # check if there are extra fields to pull in
    extra_fields = CourseFormatConditionalFields.get_assoc_field(status_for_user)
    for extra_field in extra_fields:
        formatted_run[extra_field['format_field']] = getattr(course_run, extra_field['course_run_field'])

    if status_for_user == CourseStatus.PASSED:
        formatted_run['final_grade'] = mmtrack.get_final_grade(course_run.edx_course_key)
    # if the course is not passed the final grade is the current grade
    elif status_for_user == CourseStatus.NOT_PASSED:
        formatted_run['final_grade'] = mmtrack.get_current_grade(course_run.edx_course_key)
    # any other status but "offered" should have the current grade
    elif status_for_user != CourseStatus.OFFERED:
        formatted_run['current_grade'] = mmtrack.get_current_grade(course_run.edx_course_key)

    return formatted_run
