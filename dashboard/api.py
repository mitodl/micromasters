"""
Apis for the dashboard
"""
import datetime
import logging

import pytz
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction

log = logging.getLogger(__name__)

# pylint: disable=too-many-branches


class CourseStatus():
    """
    Possible statuses for a course for a user
    """
    PASSED = 'passed'
    NOT_PASSED = 'not-passed'
    CURRENT_GRADE = 'verified-not-completed'
    UPGRADE = 'enrolled-not-verified'
    NOT_OFFERED = 'not-offered'
    OFFERED = 'offered-not-enrolled'

    @classmethod
    def all_statuses(cls):
        """Helper to get all the statuses"""
        return [cls.PASSED, cls.NOT_PASSED, cls.CURRENT_GRADE,
                cls.UPGRADE, cls.NOT_OFFERED, cls.OFFERED]


class CourseRunStatus():
    """
    Possible statuses for a course run for a user
    """
    NOT_ENROLLED = 'not-enrolled'
    GRADE = 'grade'
    READ_CERT = 'read-cert'
    WILL_ATTEND = 'will-attend'
    UPGRADE = 'upgrade'
    NOT_PASSED = 'not-passed'


class CourseFormatConditionalFields():
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
        CourseStatus.CURRENT_GRADE: [
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
        if course_status not in CourseStatus.all_statuses():
            raise ImproperlyConfigured(
                '{} not defined in Courses.api.CourseStatus'.format(course_status))
        return cls.ASSOCIATED_FIELDS.get(course_status, [])


class CourseRunUserStatus():
    """
    Representation of a course run status for a specific user
    """
    def __init__(self, status, course_run=None, enrollment_for_course=None):
        self.status = status
        self.course_run = course_run
        self.enrollment_for_course = enrollment_for_course

    def __repr__(self):
        return "<CourseRunUserStatus for course {course} status {status} at {address}>".format(
            status=self.status,
            course=self.course_run.title if self.course_run is not None else '"None"',
            address=hex(id(self))
        )


def get_info_for_program(program, user, enrollments, certificates):
    """
    Helper function that formats a program with all the courses and runs

    Args:
        program (Program): a program
        user (User): an user object
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
        "courses": []
    }
    for course in program.course_set.all():
        data['courses'].append(
            get_info_for_course(user, course, enrollments, certificates)
        )
    data['courses'].sort(key=lambda x: x['position_in_program'])
    return data


def get_info_for_course(user, course, user_enrollments, user_certificates):
    """
    Checks the status of a course given the status of all its runs

    Args:
        user (User): an user object
        course (Course): a course object
        user_enrollments (Enrollments): the user enrollments object
        user_certificates (Certificates): the user certificates objects

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
        "status": None,
    }
    with transaction.atomic():
        if not course.courserun_set.count():
            course_data['status'] = CourseStatus.NOT_OFFERED
            return course_data
        # get all the run statuses
        run_statuses = [get_status_for_courserun(course_run, user_enrollments)
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
        status = CourseStatus.OFFERED if next_run is not None else CourseStatus.NOT_OFFERED
        course_data['status'] = status
        if next_run is not None:
            course_data['runs'].append(
                format_courserun_for_dashboard(next_run, status, position=len(course_data['runs'])+1))
    elif run_status.status == CourseRunStatus.NOT_PASSED:
        next_run = course.get_next_run()
        status = CourseStatus.OFFERED if next_run is not None else CourseStatus.NOT_OFFERED
        course_data['status'] = status
        if next_run is not None:
            course_data['runs'].append(
                format_courserun_for_dashboard(next_run, status, position=len(course_data['runs'])+1))
        if next_run is None or run_status.course_run.pk != next_run.pk:
            course_data['runs'].append(
                format_courserun_for_dashboard(
                    run_status.course_run, CourseStatus.NOT_PASSED, position=len(course_data['runs'])+1)
            )
    elif run_status.status == CourseRunStatus.GRADE:
        course_data['status'] = CourseStatus.CURRENT_GRADE
        course_data['runs'].append(
            format_courserun_for_dashboard(
                run_status.course_run, CourseStatus.CURRENT_GRADE, position=len(course_data['runs'])+1)
        )
    # check if we need to check the certificate
    elif run_status.status == CourseRunStatus.READ_CERT:
        # if there is no certificate for the user, the user never passed
        # the course, so she needs to enroll in the next one
        if not user_certificates.has_verified_cert(run_status.course_run.edx_course_key):
            next_run = course.get_next_run()
            status = CourseStatus.OFFERED if next_run is not None else CourseStatus.NOT_OFFERED
            course_data['status'] = status
            if next_run is not None:
                course_data['runs'].append(
                    format_courserun_for_dashboard(next_run, status, position=len(course_data['runs'])+1)
                )
            # add the run of the status anyway if the next run is different from the one just added
            if next_run is None or run_status.course_run.pk != next_run.pk:
                course_data['runs'].append(
                    format_courserun_for_dashboard(
                        run_status.course_run, CourseStatus.NOT_PASSED, position=len(course_data['runs'])+1)
                )
        else:
            # pull the verified certificate for course
            cert = user_certificates.get_verified_cert(run_status.course_run.edx_course_key)
            course_data['status'] = CourseStatus.PASSED
            course_data['runs'].append(
                format_courserun_for_dashboard(
                    run_status.course_run,
                    CourseStatus.PASSED,
                    cert,
                    position=len(course_data['runs'])+1
                )
            )
    elif run_status.status == CourseRunStatus.WILL_ATTEND:
        course_data['status'] = CourseStatus.CURRENT_GRADE
        course_data['runs'].append(
            format_courserun_for_dashboard(
                run_status.course_run, CourseStatus.CURRENT_GRADE, position=len(course_data['runs'])+1)
            )
    elif run_status.status == CourseRunStatus.UPGRADE:
        course_data['status'] = CourseStatus.UPGRADE
        course_data['runs'].append(
            format_courserun_for_dashboard(
                run_status.course_run, CourseStatus.UPGRADE, position=len(course_data['runs'])+1)
            )

    # final check before returning the data
    if course_data['status'] is None:
        # this should never happen, but put a default behavior just in case
        log.critical(
            'course %s for user %s has status %s',
            run_status.course_run.edx_course_key,
            user.username,
            run_status.status
        )
        next_run = course.get_next_run()
        status = CourseStatus.OFFERED if next_run is not None else CourseStatus.NOT_OFFERED
        course_data['status'] = status
        if next_run is not None:
            course_data['runs'].append(
                format_courserun_for_dashboard(next_run, status, position=len(course_data['runs'])+1)
            )
        # add the run of the status anyway if the next run is different from the one just added
        if next_run is None or run_status.course_run.pk != next_run.pk:
            course_data['runs'].append(
                format_courserun_for_dashboard(
                    run_status.course_run, CourseStatus.NOT_PASSED, position=len(course_data['runs'])+1)
            )

    # add all the other runs with status != NOT_ENROLLED
    # the first one (or two in some cases) has been added with the logic before
    for run_status in run_statuses:
        if run_status.status != CourseRunStatus.NOT_ENROLLED:
            if (run_status.status == CourseRunStatus.READ_CERT and
                    user_certificates.has_verified_cert(run_status.course_run.edx_course_key)):
                # in this case the user might have passed the course also in the past
                cert = user_certificates.get_verified_cert(run_status.course_run.edx_course_key)
                course_data['runs'].append(
                    format_courserun_for_dashboard(
                        run_status.course_run,
                        CourseStatus.PASSED,
                        cert,
                        position=len(course_data['runs'])+1
                    )
                )
            else:
                # any other status means that the student never passed the course run
                course_data['runs'].append(
                    format_courserun_for_dashboard(
                        run_status.course_run,
                        CourseStatus.NOT_PASSED,
                        position=len(course_data['runs'])+1
                    )
                )

    return course_data


def get_status_for_courserun(course_run, user_enrollments):
    """
    Checks the status of a course run for a user given her enrollments

    Args:
        course_run (CourseRun): a course run
        user_enrollments (Enrollments): the user enrollments

    Returns:
        CourseRunUserStatus: an object representing the run status for the user
    """
    if not user_enrollments.is_enrolled_in(course_run.edx_course_key):
        return CourseRunUserStatus(CourseRunStatus.NOT_ENROLLED, course_run)
    course_enrollment = user_enrollments.get_enrollment_for_course(course_run.edx_course_key)
    status = None
    if course_enrollment.is_verified:
        if course_run.is_current:
            status = CourseRunStatus.GRADE
        elif course_run.is_past:
            status = CourseRunStatus.READ_CERT
        elif course_run.is_future:
            status = CourseRunStatus.WILL_ATTEND
    else:
        if (course_run.is_current or course_run.is_future) and course_run.is_upgradable:
            status = CourseRunStatus.UPGRADE
        else:
            status = CourseRunStatus.NOT_PASSED
    return CourseRunUserStatus(
        status=status,
        course_run=course_run,
        enrollment_for_course=course_enrollment
    )


def format_courserun_for_dashboard(course_run, status_for_user, certificate=None, position=1):
    """
    Helper function that formats a course run adding informations to the fields coming from the DB

    Args:
        course_run (CourseRun): a course run
        status_for_user (str): a string representing the status of a course for the user
        certificate (Certificate): an object representing the
            certificate of the user for this run

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
    }

    # check if there are extra fields to pull in
    extra_fields = CourseFormatConditionalFields.get_assoc_field(status_for_user)
    for extra_field in extra_fields:
        formatted_run[extra_field['format_field']] = getattr(course_run, extra_field['course_run_field'])

    if status_for_user == CourseStatus.PASSED:
        if certificate is not None:
            # if the status is passed, pull the grade and the certificate url
            formatted_run['grade'] = certificate.grade
            formatted_run['certificate_url'] = certificate.download_url
        else:
            # this should never happen, but just in case
            log.error('A valid certificate was expected')

    if status_for_user == CourseStatus.CURRENT_GRADE:
        # TODO: here goes the logic to pull the current grade  # pylint: disable=fixme
        pass
    return formatted_run
