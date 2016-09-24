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

from ecommerce.models import CoursePrice
from courses.models import CourseRun
from dashboard import models
from profiles.api import get_social_username

log = logging.getLogger(__name__)

# pylint: disable=too-many-branches

REFRESH_CERT_CACHE_HOURS = 6
REFRESH_GRADES_CACHE_HOURS = 1
REFRESH_ENROLLMENT_CACHE_MINUTES = 5


class RunStatus:
    """
    Possible statuses for a course run for a user
    """
    CURRENTLY_ENROLLED = 'currently-enrolled'
    PASSED = 'passed'
    WILL_ATTEND = 'will-attend'
    CAN_UPGRADE = 'can-upgrade'
    NOT_PASSED = 'not-passed'
    NOT_ACTIONABLE = 'not-actionable'
    OFFERED = 'offered'

    @classmethod
    def all_statuses(cls):
        """Helper to get all status values"""
        return {cls.CURRENTLY_ENROLLED, cls.PASSED, cls.WILL_ATTEND, cls.CAN_UPGRADE,
                cls.NOT_PASSED, cls.NOT_ACTIONABLE, cls.OFFERED}


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
        RunStatus.OFFERED: [
            {
                'course_run_field': 'enrollment_start',
                'format_field': 'enrollment_start_date'
            },
            {
                'course_run_field': 'fuzzy_enrollment_start_date',
                'format_field': 'fuzzy_enrollment_start_date'
            },
        ],
        RunStatus.CURRENTLY_ENROLLED: [
            {
                'course_run_field': 'start_date',
                'format_field': 'course_start_date'
            },
        ]
    }

    @classmethod
    def get_assoc_field(cls, course_status):
        """
        Method to get from the ASSOCIATED_FIELDS dict
        """
        if course_status not in RunStatus.all_statuses():
            raise ImproperlyConfigured('{} not defined in Courses.api.CourseStatus'.format(course_status))
        return cls.ASSOCIATED_FIELDS.get(course_status, [])


class UserCourseRun:
    """
    Representation of a course run for a specific user
    """
    def __init__(self, course_run, status, certificate=None):
        self.course_run = course_run
        self.status = status
        self.certificate = certificate

    def __repr__(self):
        return "<CourseRunUserStatus for course {course} status {status} at {address}>".format(
            status=self.status,
            course=self.course_run.title if self.course_run is not None else '"None"',
            address=hex(id(self))
        )


def get_formatted_program(program, enrollments, certificates):
    """
    Helper function that formats a program with all the courses and runs

    Args:
        program (Program): a program
        enrollments (Enrollments): the user enrollments object
        certificates (Certificates): the user certificates objects

    Returns:
        dict: a dictionary containing information about the program
    """
    # basic data for the program
    data = {
        "id": program.pk,
        "description": program.description,
        "title": program.title,
        "financial_aid_availability": program.financial_aid_availability,
        "courses": []
    }
    for course in program.course_set.all():
        data['courses'].append(
            get_formatted_course(course, enrollments, certificates)
        )
    data['courses'].sort(key=lambda x: x['position_in_program'])
    return data


def get_formatted_course(course, user_enrollments, user_certificates):
    """
    Checks the status of a course given the status of all its runs

    Args:
        course (Course): a course object
        user_enrollments (Enrollments): the user enrollments object
        user_certificates (Certificates): the user certificates objects

    Returns:
        dict: dictionary representing the course status for the user
    """
    # pylint: disable=too-many-statements
    course_data = {
        "id": course.pk,
        "title": course.title,
        "position_in_program": course.position_in_program,
        "description": course.description,
        "prerequisites": course.prerequisites,
        "runs": [],
    }
    with transaction.atomic():
        if not course.courserun_set.count():
            return course_data
        enrolled_course_runs = get_sorted_enrolled_course_runs(course, user_enrollments)
    runs_for_response = get_user_course_runs_for_response(
        course,
        enrolled_course_runs,
        user_enrollments,
        user_certificates
    )
    formatted_course_runs = [
        format_courserun_for_dashboard(
            user_course_run.course_run,
            user_course_run.status,
            certificate=user_course_run.certificate,
            position=i+1
        )
        for i, user_course_run in enumerate(runs_for_response)
    ]
    course_data['runs'] = formatted_course_runs
    return course_data


def get_sorted_enrolled_course_runs(course, user_enrollments):
    """
    Gets a sorted list of course runs that the user has enrolled in

    Args:
        course (Course): a course object
        user_enrollments (Enrollments): the user enrollments object

    Returns:
        list(CourseRun): sorted list of enrolled course runs
    """
    user_enrollments = user_enrollments or Enrollments({})
    enrolled_edx_course_ids = user_enrollments.get_enrolled_course_ids()
    enrolled_run_query = course.courserun_set.filter(edx_course_key__in=enrolled_edx_course_ids)
    if not len(enrolled_edx_course_ids) or not enrolled_run_query.count():
        return []
    # Sort course runs by descending end_date, with null end_dates sorted before all others
    return sorted(
        enrolled_run_query.all(),
        key=lambda course_run: course_run.end_date or datetime.datetime(datetime.MAXYEAR, 1, 1, tzinfo=pytz.utc),
        reverse=True
    )


def get_user_course_runs_for_response(course, enrolled_course_runs, user_enrollments, user_certificates):
    """
    Gets all course runs with additional information (status, etc.) that will be returned in the
    API response

    Args:
        course (Course): a course object
        enrolled_course_runs (list(CourseRun)): an iterable of enrolled course runs
        user_enrollments (Enrollments): the user enrollments object
        user_certificates (Certificates): the user certificates object

    Returns:
        list(UserCourseRun): list of UserCourseRun objects
    """
    if not len(enrolled_course_runs):
        next_run = course.get_next_run()
        if next_run is not None:
            return [UserCourseRun(next_run, RunStatus.OFFERED)]
    runs = []
    latest_course_run = enrolled_course_runs.pop(0)
    status = get_course_run_status(latest_course_run, user_enrollments, user_certificates)
    if status in {RunStatus.CURRENTLY_ENROLLED, RunStatus.CAN_UPGRADE}:
        runs.append(UserCourseRun(latest_course_run, status))
    elif status == RunStatus.WILL_ATTEND:
        runs.append(UserCourseRun(latest_course_run, RunStatus.CURRENTLY_ENROLLED))
    elif status == RunStatus.PASSED:
        # pull the verified certificate for course
        cert = user_certificates.get_verified_cert(latest_course_run.edx_course_key)
        runs.append(UserCourseRun(latest_course_run, RunStatus.PASSED, certificate=cert))
    elif status in {RunStatus.NOT_ACTIONABLE, RunStatus.NOT_PASSED}:
        next_run = course.get_next_run()
        if next_run is not None:
            runs.append(UserCourseRun(next_run, RunStatus.OFFERED))
        if next_run is None or latest_course_run.pk != next_run.pk:
            runs.append(UserCourseRun(latest_course_run, RunStatus.NOT_PASSED))

    # add all the other enrolled runs
    for course_run in enrolled_course_runs:
        status = get_course_run_status(course_run, user_enrollments, user_certificates)
        if status == RunStatus.PASSED:
            # in this case the user might have passed the course also in the past
            cert = user_certificates.get_verified_cert(course_run.edx_course_key)
            runs.append(UserCourseRun(course_run, RunStatus.PASSED, certificate=cert))
        else:
            # any other status means that the student never passed the course run
            runs.append(UserCourseRun(course_run, RunStatus.NOT_PASSED))
    return runs


def get_course_run_status(course_run, user_enrollments, user_certificates):
    """
    Decides what status a course run is in

    Args:
        course_run (CourseRun): a course run
        user_enrollments (Enrollments): the user enrollments object
        user_certificates (Certificates): the user certificates object

    Returns:
        string: a status
    """
    course_enrollment = user_enrollments.get_enrollment_for_course(course_run.edx_course_key)
    status = None
    if course_enrollment.is_verified:
        if course_run.is_current:
            status = RunStatus.CURRENTLY_ENROLLED
        elif course_run.is_past:
            if user_certificates.has_verified_cert(course_run.edx_course_key):
                status = RunStatus.PASSED
            else:
                status = RunStatus.NOT_PASSED
        elif course_run.is_future:
            status = RunStatus.WILL_ATTEND
    else:
        if (course_run.is_current or course_run.is_future) and course_run.is_upgradable:
            status = RunStatus.CAN_UPGRADE
        else:
            status = RunStatus.NOT_ACTIONABLE
    return status


def format_courserun_for_dashboard(course_run, status, certificate=None, position=1):
    """
    Helper function that formats a course run adding informations to the fields coming from the DB

    Args:
        course_run (CourseRun): a course run
        status (str): a string representing the status of a course run for the user
        certificate (Certificate): an object representing the
            certificate of the user for this run
        position (int): The position of the course run within the list

    Returns:
        dict: a dictionary containing information about the course
    """
    formatted_run = {
        'id': course_run.id,
        'course_id': course_run.edx_course_key,
        'title': course_run.title,
        'status': status,
        'position': position,
        'course_start_date': course_run.start_date,
        'course_end_date': course_run.end_date,
        'fuzzy_start_date': course_run.fuzzy_start_date
    }

    # check if there are extra fields to pull in
    extra_fields = CourseFormatConditionalFields.get_assoc_field(status)
    for extra_field in extra_fields:
        formatted_run[extra_field['format_field']] = getattr(course_run, extra_field['course_run_field'])

    if status == RunStatus.PASSED:
        if certificate is not None:
            # if the status is passed, pull the grade and the certificate url
            formatted_run['grade'] = certificate.grade
            formatted_run['certificate_url'] = certificate.download_url
        else:
            # this should never happen, but just in case
            log.error('A valid certificate was expected')

    if status == RunStatus.CURRENTLY_ENROLLED:
        # TODO: here goes the logic to pull the current grade  # pylint: disable=fixme
        pass

    if status == RunStatus.OFFERED or status == RunStatus.CAN_UPGRADE:
        try:
            course_price = CoursePrice.objects.get(course_run=course_run, is_valid=True)
            formatted_run['price'] = course_price.price
        except CoursePrice.DoesNotExist:
            pass

    return formatted_run


def _check_if_refresh(user, cached_model, refresh_delta):
    """
    Helper function to check if cached data in a model need to be refreshed.
    Args:
        user (django.contrib.auth.models.User): A user
        cached_model (dashboard.models.CachedEdxInfoModel): a model containing cached data
        refresh_delta (datetime.datetime): time limit for refresh the data

    Returns:
        tuple: a tuple containing:
            a boolean representing if the data needs to be refreshed
            a queryset object of the cached objects
            a list of course ids
    """
    course_ids = CourseRun.objects.filter(course__program__live=True).exclude(
        Q(edx_course_key__isnull=True) | Q(edx_course_key__exact='')
    ).values_list("edx_course_key", flat=True)

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
            # get the certificate data or None
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
        is_data_fresh, grades_queryset, course_ids = _check_if_refresh(
            user, models.CachedCurrentGrade, refresh_delta)
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
        for course_id in course_ids:
            current_grade = current_grades.get_current_grade(course_id)
            # get the certificate data or None
            # None means we will cache the fact that the student
            # does not have a certificate for the given course
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
