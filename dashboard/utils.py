"""
Utility functions and classes for the dashboard
"""
import logging
from decimal import Decimal
from math import floor

import datetime

import pytz
from django.db import transaction
from django.db.models import Q, Count
from django.urls import reverse

from courses.models import CourseRun, Course
from dashboard.api_edx_cache import CachedEdxUserData
from dashboard.models import ProgramEnrollment
from ecommerce.models import Order, Line
from grades.constants import FinalGradeStatus
from grades.models import (
    FinalGrade,
    ProctoredExamGrade,
    MicromastersProgramCertificate,
    CombinedFinalGrade,
    MicromastersCourseCertificate,
    MicromastersProgramCommendation)
from exams.models import (
    ExamProfile,
    ExamAuthorization,
    ExamRun,
)
from micromasters.utils import now_in_utc

# maximum number of exam attempts per payment
ATTEMPTS_PER_PAID_RUN_OLD = 2  # the number of attempts the user gets for payment before the first date
ATTEMPTS_PER_PAID_RUN = 1

log = logging.getLogger(__name__)


class MMTrack:
    """
    Abstraction around the user status in courses.
    Needed because the user enrollment "verified" and user passed status
    can be checked in different ways depending on if the program offers financial aid or not.
    """
    # pylint: disable=too-many-instance-attributes, too-many-arguments, too-many-public-methods

    user = None
    program = None
    enrollments = None
    current_grades = None
    certificates = None
    edx_course_keys = set()
    edx_course_keys_no_exam = set()  # Course keys for courses that don't have exams
    exam_card_status = None
    has_exams = False

    def __init__(self, user, program, edx_user_data):
        """
        Args:
            user (User): a Django user
            program (programs.models.Program): program where the user is enrolled
            edx_user_data (dashboard.api_edx_cache.CachedEdxUserData): A CachedEdxUserData object
        """
        self.now = now_in_utc()
        self.user = user
        self.program = program
        self.enrollments = edx_user_data.enrollments
        self.current_grades = edx_user_data.current_grades
        self.certificates = edx_user_data.certificates
        self.financial_aid_available = program.financial_aid_availability
        self.paid_course_fa = {}  # courses_id -> payment number association for financial aid courses

        with transaction.atomic():
            # Maps a CourseRun's edx_course_key to its parent Course id
            self.edx_key_course_map = dict(
                CourseRun.objects.not_discontinued().filter(course__program=program).exclude(
                    Q(edx_course_key__isnull=True) | Q(edx_course_key__exact='')
                ).values_list("edx_course_key", "course__id")
            )
            self.edx_course_keys = set(self.edx_key_course_map.keys())

            self.has_exams = ExamRun.objects.filter(course__program=self.program).exists()
            if self.has_exams:
                # edx course keys for courses with no exam
                self.edx_course_keys_no_exam = set(CourseRun.objects.not_discontinued().filter(
                    course__program=program, course__exam_runs__isnull=True
                ).values_list("edx_course_key", flat=True))

                for course in self.program.course_set.all():
                    self.paid_course_fa[course.id] = self.get_payments_count_for_course(course) > 0

    def __str__(self):
        return 'MMTrack for user {0} on program "{1}"'.format(
            self.user.username,
            self.program.title
        )

    def _is_course_in_program(self, edx_course_key):
        """
        Returns whether the edx_course_key id belongs to the program
        """
        return edx_course_key in self.edx_course_keys

    def get_program_enrollment(self):
        """
        Returns ProgramEnrollment for this mmtrack
        """
        return ProgramEnrollment.objects.filter(user=self.user, program=self.program).first()

    def get_course_ids(self):
        """
        Returns a set of valid Course id's in the given program

        Returns:
            set: Course id integers
        """
        return set(self.edx_key_course_map.values())

    def is_enrolled(self, edx_course_key):
        """
        Returns whether the user is enrolled at least audit in a course run.

        Args:
            edx_course_key (str): an edX course run key

        Returns:
            bool: whether the user is enrolled audit in the course run
        """
        return self._is_course_in_program(edx_course_key) and self.enrollments.is_enrolled_in(edx_course_key)

    def is_enrolled_mmtrack(self, edx_course_key):
        """
        Returns whether an used is enrolled mmtrack in a course run.
        This means if the user is enrolled verified for normal programs
        or enrolled and paid on micromasters for financial aid ones.

        Args:
            edx_course_key (str): an edX course run key

        Returns:
            bool: whether the user is enrolled mmtrack in the course run
        """
        return self.is_enrolled(edx_course_key) and self.has_paid(edx_course_key)

    def has_verified_enrollment(self, edx_course_key):
        """
        Returns true if user has a verified enrollment

        Args:
            edx_course_key (str): an edX course run key

        Returns:
            bool: whether the user has a verified enrollment
        """
        enrollment = self.enrollments.get_enrollment_for_course(edx_course_key)
        return bool(enrollment and enrollment.is_verified)

    def has_passing_certificate(self, edx_course_key):
        """
        Returns whether the user has a passing certificate.

        Args:
            edx_course_key (str): An edX course key
        Returns:
            bool: whether the user has a passing certificate meaning that the user passed the course on edX
        """
        if not self.certificates.has_verified_cert(edx_course_key):
            return False
        certificate = self.certificates.get_verified_cert(edx_course_key)
        return certificate.is_passing

    @property
    def final_grade_qset(self):
        """Base queryset for the MMTrack User's completed FinalGrades"""
        return FinalGrade.objects.filter(user=self.user, status=FinalGradeStatus.COMPLETE)

    def get_final_grade(self, edx_course_key):
        """
        Gets a user's FinalGrade for a CourseRun matching a course run key

        Args:
            edx_course_key (str): an edX course run key
        Returns:
            FinalGrade: a Final Grade object or None
        """
        return self.final_grade_qset.for_course_run_key(edx_course_key).first()

    def get_required_final_grade(self, edx_course_key):
        """
        Gets a user's FinalGrade for a CourseRun matching a course run key. This should be used
        in cases where a user is expected to have a FinalGrade for the given CourseRun.

        Args:
            edx_course_key (str): an edX course run key
        Raises:
            FinalGrade.DoesNotExist: raised if a FinalGrade record was not found
        Returns:
            FinalGrade: a Final Grade object
        """
        return self.final_grade_qset.for_course_run_key(edx_course_key).get()

    def has_final_grade(self, edx_course_key):
        """
        Checks if there is a final grade for the course run

        Args:
            edx_course_key (str): an edX course run key
        Returns:
            bool: whether a frozen final grade exists
        """
        return self.final_grade_qset.for_course_run_key(edx_course_key).exists()

    def has_paid(self, edx_course_key):
        """
        Returns true if user paid for a course run.

        Args:
            edx_course_key (str): an edX course run key

        Returns:
            bool: whether the user is paid
        """
        # edx_course_key for a course run can either be unique or None.
        # If edx course keys lookup is none we should have no payment against it
        if edx_course_key is None:
            return False
        has_paid = False
        # financial aid programs might have a paid entry for the course
        if self.has_exams:
            # get the course associated with the course key
            course = Course.objects.get(courserun__edx_course_key=edx_course_key)
            has_paid = self.paid_course_fa.get(course.id, False)

        if has_paid:
            return True
        # normal programs need to have paid_on_edx in the final grades or a verified enrollment
        if self.has_final_grade(edx_course_key):
            return self.has_final_grade_paid_on_edx(edx_course_key)
        return self.has_verified_enrollment(edx_course_key)

    def get_payments_count_for_course(self, course):
        """
        Get the total count of payments for given course
        Args:
            course (courses.models.Course): a course
        Returns:
            int: count of paid course runs
        """
        return Line.objects.filter(
            order__status__in=Order.FULFILLED_STATUSES,
            order__user=self.user,
            course_key__in=course.courserun_set.values('edx_course_key'),
        ).values('order_id').distinct().count()

    def get_number_of_attempts_left(self, course):
        """
        Checks for each payment from before first date (when a payment provided two attempts)
        and find if any unused attempts are carried over to the single attempt era (when a payment
        provides one attempt).
        Calculate the number of attempts remaining based on the calculated carry over and the other
        payments and attempts.

        Args:
            course (courses.models.Course): a course
        Returns:
            int: a number of attempts left
        """
        first_date = course.program.exam_attempts_first_date
        payments_qset = Line.objects.filter(
            order__status__in=Order.FULFILLED_STATUSES,
            order__user=self.user,
            course_key__in=course.courserun_set.values('edx_course_key')
        ).order_by('created_at')
        used_attempts_qset = ExamAuthorization.objects.filter(user=self.user, course=course, exam_taken=True)
        # if for some reason the first date is not set, return the difference between payments and used attempts
        if first_date is None:
            return payments_qset.count() - used_attempts_qset.count()

        # number of payments before the first date
        old_payments = payments_qset.filter(modified_at__lt=first_date).count()
        # number of payments after the first date
        new_payments = payments_qset.filter(modified_at__gte=first_date).count()

        # number of used attempts before the second date
        old_attempts = used_attempts_qset.filter(
            exam_run__date_first_eligible__lt=self.program.exam_attempts_second_date
        ).count()
        # number of used attempts after the second date
        new_attempts = used_attempts_qset.filter(
            exam_run__date_first_eligible__gte=self.program.exam_attempts_second_date
        ).count()

        # calculate any unused attempts from for the period when one payment provided two attempts
        unused_double_attempts = (old_payments * ATTEMPTS_PER_PAID_RUN_OLD) - old_attempts
        if unused_double_attempts > 0:
            # the user has unused attempts from before the first date
            # divide unused attempts from before the first date by two since payments are
            # only valid for one attempt after the second date. This is the carryover.
            attempts_carryover = floor(unused_double_attempts / 2)
            # Calculate the number of remaining attempts
            #   the number of payments after the first date
            #   minus the number of attempts after the second date
            #   plus the carryover attempts
            return new_payments - new_attempts + attempts_carryover
        elif unused_double_attempts == 0:
            # there is no carry over
            return new_payments - new_attempts

        else:
            # the user has more used attempts (before the second date) than payments (before the first date)
            # this can happen if the user made at least one payment and attempt both after the first date
            # find the number of attempts without the double attempts and subtract that from new payments
            single_attempts = used_attempts_qset.count() - old_payments * ATTEMPTS_PER_PAID_RUN_OLD
            return new_payments - single_attempts

    def has_paid_for_any_in_program(self):
        """
        Returns true if a user has paid for any course run in the program
        """
        return any(self.has_paid(edx_course_key) for edx_course_key in self.edx_course_keys)

    def has_final_grade_paid_on_edx(self, edx_course_key):
        """
        Checks if there is a a frozen final grade and the user paid for it.

        Args:
            edx_course_key (str): an edX course run key
        Returns:
            bool: whether or not a user has a final grade and has paid
        """
        return self.final_grade_qset.paid_on_edx().for_course_run_key(edx_course_key).exists()

    def has_paid_final_grade(self, edx_course_key):
        """
        Checks if there is a a frozen final grade and the user paid for it.

        Args:
            edx_course_key (str): an edX course run key
        Returns:
            bool: whether a frozen final grade exists
        """
        return self.has_final_grade(edx_course_key) and self.has_paid(edx_course_key)

    def paid_but_missed_deadline(self, course_run):
        """
        Checks if user paid for this run only after the deadline
        """
        if self.has_paid(course_run.edx_course_key):
            orders = Order.objects.filter(
                status__in=Order.FULFILLED_STATUSES,
                user=self.user,
                line__course_key=course_run.edx_course_key,
                modified_at__gt=course_run.upgrade_deadline,
            )
            if orders.exists():
                return True
        return False

    def has_passed_course_run_run(self, edx_course_key):
        """
        Returns whether the user has passed a course run.

        Args:
            edx_course_key (str): an edX course run key
        Returns:
            bool: whether the user has passed the course_run
        """
        final_grade = self.get_final_grade(edx_course_key)
        return final_grade.passed if final_grade else False

    def has_passed_course(self, course):
        """
        Returns true if the user has passed this course overall
        Args:
            course (Course): course instance

        Returns:
            bool: whether the user has passed the course
        """
        if self.has_exams:
            course_cert = MicromastersCourseCertificate.objects.filter(
                user=self.user,
                course_id=course.id).exists()
            if course_cert:
                return True
            else:
                return FinalGrade.objects.filter(
                    user=self.user,
                    course_run__course_id=course.id,
                    course_run__start_date__gt=datetime.datetime(2022, 9, 1, tzinfo=pytz.UTC),
                ).passed().exists()
        else:
            return self.final_grade_qset.filter(course_run__course_id=course.id).passed().exists()

    def get_final_grade_percent(self, edx_course_key):
        """
        Returns the course final grade number for the user if she passed.

        Args:
            edx_course_key (str): an edX course run key
        Returns:
            float: the final grade of the user in the course
        """
        final_grade = self.get_final_grade(edx_course_key)
        return final_grade.grade_percent if final_grade else None

    def get_all_final_grades(self):
        """
        Returns a list of final grades for only the passed courses.

        Returns:
            dict: dictionary of course_ids: FinalGrade objects
        """
        grades = (
            self.final_grade_qset
            .for_course_run_keys(self.edx_course_keys)
            .select_related('course_run')
        )
        return {grade.course_run.edx_course_key: grade for grade in grades}

    def get_final_grades_for_course(self, course):
        """

        Args:
            course (courses.models.Course): a course
        Returns:
            qset: a queryset of all final grades for course
        """
        return self.final_grade_qset.filter(course_run__in=course.courserun_set.all()).order_by('-grade')

    def get_best_final_grade_for_course(self, course):
        """
        Return the best final grade for given course

        Args:
            course (courses.models.Course): a course
        Returns:
            grades.models.FinalGrade: the best final grade
        """
        return self.get_final_grades_for_course(course).passed().first()

    def get_overall_final_grade_for_course(self, course):
        """
        Calculate overall grade for course

        Args:
           course (courses.models.Course): A course
        Returns:
           str: the overall final grade
        """
        best_grade = self.get_best_final_grade_for_course(course)
        if best_grade is None:
            return ""
        if not course.has_exam:
            return str(round(best_grade.grade_percent))

        combined_grade = CombinedFinalGrade.objects.filter(user=self.user, course=course)
        if combined_grade.exists():
            return str(round(combined_grade.first().grade))
        return ""

    def get_all_enrolled_course_runs(self):
        """
        Returns a list of CourseRuns for which the user is either enrolled
        or has a final grade

        Returns:
            list: list of CourseRuns
        """
        enrolled_course_ids = []
        final_grades = self.get_all_final_grades()
        for course_id in self.edx_course_keys:
            if course_id in final_grades or self.enrollments.is_enrolled_in(course_id):
                enrolled_course_ids.append(course_id)

        return list(CourseRun.objects.not_discontinued().filter(edx_course_key__in=enrolled_course_ids).select_related('course'))

    def calculate_final_grade_average(self):
        """
        Calculates an average grade (integer) from the program final grades

        Returns:
            float: The average final grade or None if no final grades
        """
        final_grades = self.final_grade_qset.for_course_run_keys(self.edx_course_keys)
        if final_grades:
            return round(
                sum(Decimal(final_grade.grade_percent) for final_grade in final_grades) /
                len(final_grades)
            )
        return None

    def get_current_grade(self, edx_course_key):
        """
        Returns the current grade number for the user in the course run if enrolled.

        Args:
            edx_course_key (str): an edX course run key
        Returns:
            float: the current grade of the user in the course run
        """
        if not self.is_enrolled(edx_course_key):
            return None
        current_grade = self.current_grades.get_current_grade(edx_course_key)
        if current_grade is None:
            return None
        return float(current_grade.percent) * 100

    def count_courses_passed(self):
        """
        Calculates the total number of passed courses in program.

        Returns:
            int: A number of passed courses.
        """
        if self.has_exams:
            return sum([
                CombinedFinalGrade.objects.filter(user=self.user, course__program=self.program).count(),
                self.count_passing_courses_for_keys(self.edx_course_keys_no_exam)
            ])
        else:
            return self.count_passing_courses_for_keys(self.edx_course_keys)

    def count_passing_courses_for_keys(self, edx_course_keys):
        """
        Calculate the number of passed courses for a given list of edx_course_keys

        Args:
            edx_course_keys (set): a set of edx_course_keys
        Returns:
            int: A number of passed courses
        """
        return (
            self.final_grade_qset.for_course_run_keys(edx_course_keys).passed()
            .values_list('course_run__course__id', flat=True)
            .distinct().count()
        )

    def count_passed_final_grades_for_course_ids(self, course_ids):
        """
        Determine the number of passed courses for a non-FA program by

        Args:
            course_ids (set): a set of course ids

        Returns:
            int: the number of passed unique courses
        """
        return (
            self.final_grade_qset.filter(
                course_run__course_id__in=course_ids
            ).passed().values_list('course_run__course__id', flat=True).distinct().count()
        )

    def get_number_of_passed_courses(self, course_ids):
        """
        Count the number of passed courses for the given set of course ids
        Args:
            course_ids (set): a set of course ids

        Returns:
            int: the number of passed unique courses
        """
        if self.has_exams:
            course_ids_passing_grade = FinalGrade.objects.filter(
                user=self.user,
                course_run__course_id__in=course_ids,
                course_run__start_date__gt=datetime.datetime(2022, 9, 1, tzinfo=pytz.UTC),
            ).passed().values_list('course_run__course__id', flat=True).distinct()
            num_certs = MicromastersCourseCertificate.objects.filter(
                user=self.user,
                course_id__in=list(set(course_ids) - set(course_ids_passing_grade))
            ).values_list('course__id', flat=True).distinct().count()
            return num_certs + len(course_ids_passing_grade)
        else:
            return self.count_passed_final_grades_for_course_ids(course_ids)

    def get_number_of_passed_courses_for_completion(self):
        """
        Count the number of courses the user passed for completion of the program
        Takes into account elective courses, and counts only the number that is required to
        complete the program.

        Returns:
            int: the number of passed unique courses
        """

        if self.program.electives_set.exists():
            passed_courses = 0
            for electives_set in self.program.electives_set.all():
                elective_courses_id = set(electives_set.electivecourse_set.all().values_list('course__id', flat=True))

                # each elective set should be fulfilled
                passed_courses += min(
                    electives_set.required_number, self.get_number_of_passed_courses(elective_courses_id)
                )
            core_courses_ids = set(self.program.course_set.filter(electivecourse=None).values_list('id', flat=True))

            # checking the number of core courses passed
            passed_courses += self.get_number_of_passed_courses(core_courses_ids)
            return passed_courses
        else:
            return self.count_courses_passed()

    def get_exam_card_status(self):  # pylint: disable=too-many-return-statements
        """
        Get the pearson exam status for the user / program combo

        Returns:
            str: description of Pearson profile status
        """
        exam_runs = ExamRun.objects.filter(
            course__program=self.program,
        )

        if not exam_runs.exists():
            return ""

        future_runs = exam_runs.filter(
            date_last_eligible__gte=self.now.date(),
        )

        user = self.user
        try:
            ExamProfile.objects.only('status').get(profile=user.profile)
        except ExamProfile.DoesNotExist:
            return ExamProfile.PROFILE_ABSENT

        auths = ExamAuthorization.objects.filter(
            user=user,
            status=ExamAuthorization.STATUS_SUCCESS,
            exam_run__in=future_runs,
        )
        if auths.exists():
            return ExamProfile.PROFILE_SCHEDULABLE
        else:
            return ExamProfile.PROFILE_SUCCESS

    def get_best_proctored_exam_grade(self, course):

        """
        Returns the best exam grade

        Args:
            course (courses.models.Course): a course

        Returns:
            grades.models.ProctoredExamGrade: the best exam grade
        """
        return self.get_course_proctorate_exam_results(course).filter(
            passed=True
        ).order_by('-percentage_grade').first()

    def get_course_proctorate_exam_results(self, course):
        """
        Returns the queryset of the proctorate exams results for the user in a course

        Args:
            course (courses.models.Course): a course

        Returns:
            qset: a queryset of grades.models.ProctoredExamGrade
        """
        return ProctoredExamGrade.for_user_course(self.user, course)

    def get_course_certificate(self, course):
        """
        Returns a course certificate available for display on the dashboard

        Args:
            course (courses.models.Course): a course
        Returns:
            grades.models.MicromastersCourseCertificate: a course certificate
        """
        return MicromastersCourseCertificate.objects.filter(user=self.user, course=course).annotate(
            signatories=Count('course__signatories')
        ).filter(signatories__gt=0).first()

    def program_certificate_qset(self):
        """
        Returns the queryset of micromasters program certificate

        Returns:
            qset: a queryset of grades.models.MicromastersProgramCertificate
        """
        return MicromastersProgramCertificate.objects.filter(user=self.user, program=self.program)

    def get_program_certificate_url(self):
        """
        Returns a string with program certificate url

        Returns:
            str: a string with url or empty string
        """
        certificate = self.program_certificate_qset().annotate(
            signatories=Count('program__programpage__program_certificate_signatories')
        ).filter(signatories__gt=0).first()
        if certificate is None:
            return ""
        return reverse('program-certificate', args=[certificate.hash])

    def program_letter_qset(self):
        """
        Returns the queryset of micromasters program letter

        Returns:
            qset: a queryset of grades.models.MicromastersProgramCommendation
        """
        return MicromastersProgramCommendation.objects.filter(user=self.user, program=self.program)

    def get_program_letter_url(self):
        """
        Returns a string with program letter url

        Returns:
            str: a string with url or empty string
        """
        letter = self.program_letter_qset().filter(
            program__programpage__program_letter_text__isnull=False,
            program__programpage__program_letter_logo__isnull=False, is_active=True).annotate(
                signatories=Count('program__programpage__program_letter_signatories')).filter(
                    signatories__gt=0).first()

        if not letter:
            return ""
        else:
            return reverse('program_letter', args=[letter.uuid])


def get_mmtrack(user, program):
    """
    Creates mmtrack object for given user.

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


def convert_to_letter(grade):
    """Convert a decimal number to letter grade"""
    grade = round(grade, 1)
    if grade >= 82.5:
        return 'A'
    elif grade >= 65:
        return 'B'
    elif grade >= 55:
        return 'C'
    elif grade >= 50:
        return 'D'
    else:
        return 'F'
