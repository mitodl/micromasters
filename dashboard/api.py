"""
Apis for the dashboard
"""
import datetime
import logging

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
import pytz

from backends.exceptions import InvalidCredentialStored
from courses.models import Program
from dashboard.api_edx_cache import CachedEdxDataApi, CachedEdxUserData
from dashboard.utils import MMTrack
from financialaid.serializers import FinancialAidDashboardSerializer
from grades import api
from grades.models import FinalGrade
from grades.serializers import ProctoredExamGradeSerializer
from exams.models import ExamAuthorization, ExamRun

# maximum number of exam attempts per payment
ATTEMPTS_PER_PAID_RUN = 2

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

    edx_user_data = CachedEdxUserData(user)

    response_data = {
        "programs": [],
        "is_edx_data_fresh": CachedEdxDataApi.are_all_caches_fresh(user)
    }
    all_programs = (
        Program.objects.filter(live=True, programenrollment__user=user).prefetch_related('course_set__courserun_set')
    )
    for program in all_programs:
        mmtrack_info = MMTrack(
            user,
            program,
            edx_user_data
        )
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
        "pearson_exam_status": mmtrack.get_pearson_exam_status(),
        "grade_average": mmtrack.calculate_final_grade_average(),
    }
    if mmtrack.financial_aid_available:
        data["financial_aid_user_info"] = FinancialAidDashboardSerializer.serialize(mmtrack.user, mmtrack.program)
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
        "exams_schedulable_in_future": get_future_exam_runs(course),
        "has_to_pay": has_to_pay_for_exam(mmtrack, course),
        "runs": [],
        "proctorate_exams_grades": ProctoredExamGradeSerializer(
            mmtrack.get_course_proctorate_exam_results(course), many=True
        ).data,
        "has_exam": course.has_exam,
        "certificate_url": get_certificate_url(mmtrack, course)
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
    elif run_status.status == CourseRunStatus.PAID_BUT_NOT_ENROLLED:
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
        elif run_status.status == CourseRunStatus.CAN_UPGRADE:
            _add_run(run_status.course_run, mmtrack, CourseStatus.CAN_UPGRADE)

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

    if mmtrack.has_paid_final_grade(course_run.edx_course_key):
        return CourseRunUserStatus(CourseRunStatus.CHECK_IF_PASSED, course_run)
    elif mmtrack.has_final_grade(course_run.edx_course_key):
        if course_run.is_upgradable:
            return CourseRunUserStatus(CourseRunStatus.CAN_UPGRADE, course_run)
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
        elif course_run.is_future:
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
        return
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
        else:
            formatted_run['current_grade'] = mmtrack.get_current_grade(course_run.edx_course_key)
    # any other status but "offered" should have the current grade
    elif status_for_user != CourseStatus.OFFERED:
        if mmtrack.has_final_grade(course_run.edx_course_key):
            formatted_run['final_grade'] = mmtrack.get_final_grade_percent(course_run.edx_course_key)
        else:
            formatted_run['current_grade'] = mmtrack.get_current_grade(course_run.edx_course_key)

    return formatted_run


def is_exam_schedulable(user, course):
    """
    Check if a course is ready to schedule an exam or not
    """
    schedulable_exam_runs = ExamRun.get_currently_schedulable(course)
    return ExamAuthorization.objects.filter(user=user, exam_run__in=schedulable_exam_runs).exists()


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
    final_grades = mmtrack.get_passing_final_grades_for_course(course)
    url = ""
    if final_grades.exists():
        best_grade = final_grades.first()
        if best_grade.has_certificate:
            url = "/certificate/{}".format(final_grades.first().certificate.hash)
    return url
