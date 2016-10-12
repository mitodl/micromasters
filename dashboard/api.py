"""
Apis for the dashboard
"""
import datetime
import logging

from edx_api.certificates import (
    Certificate,
    Certificates,
)
from edx_api.enrollments import Enrollments
from edx_api.grades import (
    CurrentGrade,
    CurrentGrades
)
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Q
import pytz

from courses.models import CourseRun
from dashboard import models
from profiles.api import get_social_username

log = logging.getLogger(__name__)

# pylint: disable=too-many-branches

REFRESH_CERT_CACHE_HOURS = 6
REFRESH_GRADES_CACHE_HOURS = 1
REFRESH_ENROLLMENT_CACHE_MINUTES = 5


class CourseStatus:
    """
    Possible statuses for a course for a user. These are the course run statuses used in the dashboard API.
    """
    PASSED = 'passed'
    NOT_PASSED = 'not-passed'
    CURRENTLY_ENROLLED = 'currently-enrolled'
    WILL_ATTEND = 'will-attend'
    CAN_UPGRADE = 'can-upgrade'
    OFFERED = 'offered'

    @classmethod
    def all_statuses(cls):
        """Helper to get all the statuses"""
        return [cls.PASSED, cls.NOT_PASSED, cls.CURRENTLY_ENROLLED,
                cls.CAN_UPGRADE, cls.OFFERED, cls.WILL_ATTEND]


class CourseRunStatus:
    """
    Possible statuses for a course run for a user. These are used internally.
    """
    NOT_ENROLLED = 'not-enrolled'
    CURRENTLY_ENROLLED = 'currently-enrolled'
    CHECK_IF_PASSED = 'check-if-passed'
    WILL_ATTEND = 'will-attend'
    CAN_UPGRADE = 'can-upgrade'
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
    data['courses'].sort(key=lambda x: x['position_in_program'])
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
        next_run = course.get_next_run()
        if next_run is not None:
            _add_run(next_run, mmtrack, CourseStatus.OFFERED)
    elif run_status.status == CourseRunStatus.NOT_PASSED:
        next_run = course.get_next_run()
        if next_run is not None:
            _add_run(next_run, mmtrack, CourseStatus.OFFERED)
        if next_run is None or run_status.course_run.pk != next_run.pk:
            _add_run(run_status.course_run, mmtrack, CourseStatus.NOT_PASSED)
    elif run_status.status == CourseRunStatus.CURRENTLY_ENROLLED:
        _add_run(run_status.course_run, mmtrack, CourseStatus.CURRENTLY_ENROLLED)
    # check if we need to check the certificate
    elif run_status.status == CourseRunStatus.CHECK_IF_PASSED:
        # if the user never passed the course she needs to enroll in the next one
        if not mmtrack.has_passed_course(run_status.course_run.edx_course_key):
            next_run = course.get_next_run()
            if next_run is not None:
                _add_run(next_run, mmtrack, CourseStatus.OFFERED)
            # add the run of the status anyway if the next run is different from the one just added
            if next_run is None or run_status.course_run.pk != next_run.pk:
                _add_run(run_status.course_run, mmtrack, CourseStatus.NOT_PASSED)
        else:
            _add_run(run_status.course_run, mmtrack, CourseStatus.PASSED)
    elif run_status.status == CourseRunStatus.WILL_ATTEND:
        _add_run(run_status.course_run, mmtrack, CourseStatus.WILL_ATTEND)
    elif run_status.status == CourseRunStatus.CAN_UPGRADE:
        _add_run(run_status.course_run, mmtrack, CourseStatus.CAN_UPGRADE)

    # add all the other runs with status != NOT_ENROLLED
    # the first one (or two in some cases) has been added with the logic before
    for run_status in run_statuses:
        if run_status.status != CourseRunStatus.NOT_ENROLLED:
            if (run_status.status == CourseRunStatus.CHECK_IF_PASSED and
                    mmtrack.has_passed_course(run_status.course_run.edx_course_key)):
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
    else:
        if (course_run.is_current or course_run.is_future) and course_run.is_upgradable:
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
        'position': position,
        'course_start_date': course_run.start_date,
        'course_end_date': course_run.end_date,
        'fuzzy_start_date': course_run.fuzzy_start_date
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


@transaction.atomic
def update_cached_enrollment(user, enrollment, course_id, now):
    """
    Updates the cached enrollment based on an Enrollment object

    Args:
        user (User): A user
        enrollment (Enrollment):
            An Enrollment object from edx_api_client
        course_id (str): A course key
        now (datetime.datetime): The datetime value used as now

    Returns:
        None
    """
    # get the enrollment data or None
    # None means we will cache the fact that the student
    # does not have an enrollment for the given course
    enrollment_data = enrollment.json if enrollment is not None else None
    course_run = CourseRun.objects.get(edx_course_key=course_id)
    updated_values = {
        'user': user,
        'course_run': course_run,
        'data': enrollment_data,
        'last_request': now,
    }
    models.CachedEnrollment.objects.update_or_create(
        user=user,
        course_run=course_run,
        defaults=updated_values
    )


def _check_if_refresh(user, cached_model, refresh_delta, limit_to_courses=None):
    """
    Helper function to check if cached data in a model need to be refreshed.
    Args:
        user (django.contrib.auth.models.User): A user
        cached_model (dashboard.models.CachedEdxInfoModel): a model containing cached data
        refresh_delta (datetime.datetime): time limit for refresh the data
        limit_to_courses (list): a list of course ids to limit the check

    Returns:
        tuple: a tuple containing:
            a boolean representing if the data needs to be refreshed
            a queryset object of the cached objects
            a list of course ids
    """
    course_ids = CourseRun.objects.filter(course__program__live=True).exclude(
        Q(edx_course_key__isnull=True) | Q(edx_course_key__exact='')
    ).values_list("edx_course_key", flat=True)

    if limit_to_courses is not None:
        course_ids = course_ids.filter(edx_course_key__in=limit_to_courses)

    model_queryset = cached_model.objects.filter(
        user=user,
        last_request__gt=refresh_delta,
        course_run__edx_course_key__in=course_ids,
    )
    return model_queryset.count() == len(course_ids), model_queryset, course_ids


def get_student_enrollments(user, edx_client):
    """
    Return cached enrollment data or fetch enrollment data first if necessary.
    All CourseRun will have an entry for the user: this entry will contain Null
    data if the user does not have an enrollment.

    Args:
        user (django.contrib.auth.models.User): A user
        edx_client (EdxApi): EdX client to retrieve enrollments
    Returns:
        Enrollments: an Enrollments object from edx_api.
            This may contain more enrollments than
            what we know about in MicroMasters if more exist from edX,
            or it may contain fewer enrollments if they don't exist for the course id in edX
    """
    # Data in database is refreshed after 5 minutes
    now = datetime.datetime.now(tz=pytz.utc)
    refresh_delta = now - datetime.timedelta(minutes=REFRESH_ENROLLMENT_CACHE_MINUTES)

    with transaction.atomic():
        is_data_fresh, enrollments_queryset, course_ids = _check_if_refresh(
            user, models.CachedEnrollment, refresh_delta)
        if is_data_fresh:
            # everything is cached: return the objects but exclude the not existing enrollments
            return Enrollments(
                [enrollment.data for enrollment in enrollments_queryset.exclude(data__isnull=True)]
            )

    # Data is not available in database or it's expired. Fetch new data.
    enrollments = edx_client.enrollments.get_student_enrollments()

    # Make sure all enrollments are updated atomically. It's still possible that this function executes twice and
    # we fetch the data from edX twice, but the data shouldn't be half modified at any point.
    with transaction.atomic():
        for course_id in course_ids:
            enrollment = enrollments.get_enrollment_for_course(course_id)
            update_cached_enrollment(user, enrollment, course_id, now)

    return enrollments


def get_student_certificates(user, edx_client):
    """
    Return cached certificate data or fetch certificate data first if necessary.
    All CourseRun will have an entry for the user: this entry will contain Null
    data if the user does not have a certificate.

    Args:
        user (django.contrib.auth.models.User): A user
        edx_client (EdxApi): EdX client to retrieve enrollments
    Returns:
        Certificates: a Certificates object from edx_api. This may contain more certificates than
            what we know about in MicroMasters if more exist from edX,
            or it may contain fewer certificates if they don't exist for the course id in edX.
    """
    # Certificates in database are refreshed after 6 hours
    now = datetime.datetime.now(tz=pytz.utc)
    refresh_delta = now - datetime.timedelta(hours=REFRESH_CERT_CACHE_HOURS)

    with transaction.atomic():
        is_data_fresh, certificates_queryset, course_ids = _check_if_refresh(
            user, models.CachedCertificate, refresh_delta)
        if is_data_fresh:
            # everything is cached: return the objects but exclude the not existing certs
            return Certificates([
                Certificate(certificate.data) for certificate in certificates_queryset.exclude(data__isnull=True)
            ])

    # Certificates are out of date, so fetch new data from edX.
    certificates = edx_client.certificates.get_student_certificates(
        get_social_username(user), list(course_ids))

    # This must be done atomically so the database is not half modified at any point. It's still possible to fetch
    # from edX twice though.
    with transaction.atomic():
        for course_id in course_ids:
            certificate = certificates.get_verified_cert(course_id)
            # get the certificate data or None
            # None means we will cache the fact that the student
            # does not have a certificate for the given course
            certificate_data = certificate.json if certificate is not None else None
            course_run = CourseRun.objects.get(edx_course_key=course_id)
            updated_values = {
                'user': user,
                'course_run': course_run,
                'data': certificate_data,
                'last_request': now,
            }
            models.CachedCertificate.objects.update_or_create(
                user=user,
                course_run=course_run,
                defaults=updated_values
            )

    return certificates


def get_student_current_grades(user, edx_client):
    """
    Return cached current grades data or fetch current grades data first if necessary.
    All CourseRun will have an entry for the user: this entry will contain Null
    data if the user does not have a current grade.

    Args:
        user (django.contrib.auth.models.User): A user
        edx_client (EdxApi): EdX client to retrieve enrollments
    Returns:
        CurrentGrades: a CurrentGrades object from edx_api. This may contain more current grades than
            what we know about in MicroMasters if more exist from edX,
            or it may contain fewer current grades if they don't exist for the course id in edX.
    """
    # Current Grades in database are refreshed after 1 hour
    now = datetime.datetime.now(tz=pytz.utc)
    refresh_delta = now - datetime.timedelta(hours=REFRESH_GRADES_CACHE_HOURS)

    with transaction.atomic():
        enrolled_courses = models.CachedEnrollment.objects.filter(user=user).exclude(data=None).values_list(
            "course_run__edx_course_key", flat=True)
        is_data_fresh, grades_queryset, course_ids = _check_if_refresh(
            user, models.CachedCurrentGrade, refresh_delta, enrolled_courses)
        if is_data_fresh:
            # everything is cached: return the objects but exclude the not existing certs
            return CurrentGrades([
                CurrentGrade(grade.data) for grade in grades_queryset.exclude(data__isnull=True)
            ])

    # Current Grades are out of date, so fetch new data from edX.
    current_grades = edx_client.current_grades.get_student_current_grades(
        get_social_username(user), list(course_ids))

    # This must be done atomically so the database is not half modified at any point. It's still possible to fetch
    # from edX twice though.
    with transaction.atomic():
        # update all the course ids and not only the enrolled ones
        all_mm_course_ids = CourseRun.objects.filter(course__program__live=True).exclude(
            Q(edx_course_key__isnull=True) | Q(edx_course_key__exact='')
        ).values_list("edx_course_key", flat=True)
        for course_id in all_mm_course_ids:
            current_grade = current_grades.get_current_grade(course_id)
            # get the current grade data or None
            # None means we will cache the fact that the student
            # does not have a current grade for the given course
            grade_data = current_grade.json if current_grade is not None else None
            course_run = CourseRun.objects.get(edx_course_key=course_id)
            updated_values = {
                'user': user,
                'course_run': course_run,
                'data': grade_data,
                'last_request': now,
            }
            models.CachedCurrentGrade.objects.update_or_create(
                user=user,
                course_run=course_run,
                defaults=updated_values
            )

    return current_grades
