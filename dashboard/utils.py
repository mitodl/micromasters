"""
Utility functions and classes for the dashboard
"""
import logging
from decimal import Decimal

from datetime import datetime
from django.core.exceptions import ImproperlyConfigured
from django.conf import settings
from django.db import transaction
from django.db.models import Max, Min, Q
from pytz import utc

from courses.models import CourseRun
from dashboard.api_edx_cache import CachedEdxUserData
from ecommerce.models import Line
from financialaid.constants import FinancialAidStatus
from financialaid.models import FinancialAid, TierProgram
from grades.constants import FinalGradeStatus
from grades.models import FinalGrade
from exams.models import ExamProfile, ExamAuthorization
from exams.utils import course_has_exam


log = logging.getLogger(__name__)


class MMTrack:
    """
    Abstraction around the user status in courses.
    Needed because the user enrollment "verified" and user passed status
    can be checked in different ways depending on if the program offers financial aid or not.
    """
    # pylint: disable=too-many-instance-attributes, too-many-arguments

    user = None
    program = None
    enrollments = None
    current_grades = None
    certificates = None
    course_ids = set()
    paid_course_ids = set()  # financial aid course ids for paid with the MM app
    financial_aid_available = None
    financial_aid_applied = None
    financial_aid_status = None
    financial_aid_id = None
    financial_aid_min_price = None
    financial_aid_max_price = None
    financial_aid_date_documents_sent = None
    pearson_exam_status = None

    def __init__(self, user, program, edx_user_data):
        """
        Args:
            user (User): a Django user
            program (programs.models.Program): program where the user is enrolled
            edx_user_data (dashboard.api_edx_cache.CachedEdxUserData): A CachedEdxUserData object
        """
        self.user = user
        self.program = program
        self.enrollments = edx_user_data.enrollments
        self.current_grades = edx_user_data.current_grades
        self.certificates = edx_user_data.certificates
        self.financial_aid_available = program.financial_aid_availability

        with transaction.atomic():
            # Maps a CourseRun's edx_course_key to its parent Course id
            self.edx_key_course_map = dict(
                CourseRun.objects.filter(course__program=program).exclude(
                    Q(edx_course_key__isnull=True) | Q(edx_course_key__exact='')
                ).values_list("edx_course_key", "course__id")
            )
            self.course_ids = self.edx_key_course_map.keys()
            self.pearson_exam_status = self.get_pearson_exam_status()

            if self.financial_aid_available:
                self.paid_course_ids = set(Line.objects.filter(
                    Q(order__status='fulfilled') & Q(course_key__in=self.course_ids) & Q(order__user=user)
                ).values_list("course_key", flat=True))

                financial_aid_qset = FinancialAid.objects.filter(
                    Q(user=user) & Q(tier_program__program=program)
                ).exclude(status=FinancialAidStatus.RESET)
                self.financial_aid_applied = financial_aid_qset.exists()
                if self.financial_aid_applied:
                    financial_aid = financial_aid_qset.first()
                    self.financial_aid_status = financial_aid.status
                    # set the sent document date
                    self.financial_aid_date_documents_sent = financial_aid.date_documents_sent
                    # and the financial aid ID
                    self.financial_aid_id = financial_aid.id

                # set the price range for the program
                self.financial_aid_min_price, self.financial_aid_max_price = self._get_program_fa_prices()

    def __str__(self):
        return 'MMTrack for user {0} on program "{1}"'.format(
            self.user.username,
            self.program.title
        )

    def _get_program_fa_prices(self):
        """
        Returns the financial aid possible cost range.
        """
        course_max_price = self.program.get_course_price()
        # get all the possible discounts for the program
        program_tiers_qset = TierProgram.objects.filter(
            Q(program=self.program) & Q(current=True)).order_by('discount_amount')
        if not program_tiers_qset.exists():
            log.error('The program "%s" needs at least one tier configured', self.program.title)
            raise ImproperlyConfigured(
                'The program "{}" needs at least one tier configured'.format(self.program.title))
        min_discount = program_tiers_qset.aggregate(
            Min('discount_amount')).get('discount_amount__min', 0)
        max_discount = program_tiers_qset.aggregate(
            Max('discount_amount')).get('discount_amount__max', 0)
        return course_max_price - max_discount, course_max_price - min_discount

    def _is_course_in_program(self, course_id):
        """
        Returns whether the course id belongs to the program
        """
        return course_id in self.course_ids

    def is_enrolled(self, course_id):
        """
        Returns whether the user is enrolled at least audit in a course run.

        Args:
            course_id (str): an edX course run id

        Returns:
            bool: whether the user is enrolled audit in the course
        """
        return self._is_course_in_program(course_id) and self.enrollments.is_enrolled_in(course_id)

    def is_enrolled_mmtrack(self, course_id):
        """
        Returns whether an used is enrolled mmtrack in a course run.
        This means if the user is enrolled verified for normal programs
        or enrolled and paid on micromasters for financial aid ones.

        Args:
            course_id (str): an edX course run id

        Returns:
            bool: whether the user is enrolled mmtrack in the course
        """
        return self.is_enrolled(course_id) and self.has_paid(course_id)

    def has_paid(self, course_id):
        """
        Returns true if user paid for a course.

        Args:
            course_id (str): an edX course run id

        Returns:
            bool: whether the user is paid
        """
        # financial aid programs need to have an audit enrollment and a paid entry for the course
        if self.financial_aid_available:
            return course_id in self.paid_course_ids

        # normal programs need to have a verified enrollment
        enrollment = self.enrollments.get_enrollment_for_course(course_id)
        return enrollment and enrollment.is_verified

    def has_verified_cert(self, course_id):
        """
        Returns whether the user has a verified cert.

        Args:
            course_id (str): An edX course key
        Returns:
            bool: whether the user has a verified cert meaning that they passed the course on edX
        """
        return self.certificates.has_verified_cert(course_id)

    def extract_final_grade(self, course_id):
        """
        Function that extract a final grade tuple from a global class dictionary
        or extracts the value from the database and updates such dictionary.

        Args:
            course_id (str): an edX course run id
        Returns:
            FinalGrade: a Final Grade object
        """
        try:
            final_grade = FinalGrade.objects.get(
                course_run__edx_course_key=course_id,
                user=self.user,
                status=FinalGradeStatus.COMPLETE,
            )
        except FinalGrade.DoesNotExist:
            log.exception('No final grade found for user %s in course %s', self.user.username, course_id)
            raise
        return final_grade

    def has_passed_course(self, course_id):
        """
        Returns whether the user has passed a course run.
        This means if the user has a verified certificate for normal programs
        or a current_grade with passed property and the course has ended.

        Args:
            course_id (str): an edX course run id

        Returns:
            bool: whether the user has passed the course
        """
        get_grade_algorithm_version = settings.FEATURES.get("FINAL_GRADE_ALGORITHM", "v0")
        if get_grade_algorithm_version == "v1":
            final_grade = self.extract_final_grade(course_id)
            return final_grade.passed

        # part for get_grade_algorithm_version == v0
        if not self.is_enrolled_mmtrack(course_id):
            return False

        # for normal programs need to check the certificate
        if not self.financial_aid_available:
            return self.has_verified_cert(course_id)
        # financial aid programs need to have an audit enrollment,
        # a current grade with a passed attribute and the course should be ended
        else:
            cur_grade = self.current_grades.get_current_grade(course_id)
            if cur_grade is None:
                return False
            course_run = CourseRun.objects.filter(edx_course_key=course_id).first()
            if course_run is None:
                # this should never happen, but just in case
                return False
            if course_run.end_date is None:
                log.error('Missing "end_date" for course run %s', course_id)
                raise ImproperlyConfigured('Missing "end_date" for course run {}'.format(course_id))
            return cur_grade.passed and course_run.is_past

    def get_final_grade(self, course_id):
        """
        Returns the course final grade number for the user if she passed.

        Args:
            course_id (str): an edX course run id

        Returns:
            float: the final grade of the user in the course
        """
        get_grade_algorithm_version = settings.FEATURES.get("FINAL_GRADE_ALGORITHM", "v0")
        if get_grade_algorithm_version == "v1":
            final_grade = self.extract_final_grade(course_id)
            return final_grade.grade * 100

        # part for get_grade_algorithm_version == v0
        if not self.has_passed_course(course_id):
            return
        # for normal programs need to pull from the certificate
        if not self.financial_aid_available:
            certificate = self.certificates.get_verified_cert(course_id)
            return float(certificate.grade) * 100
        # financial aid programs need to get the current grade
        # the `self.has_passed_course(course_id)` part already checked if the course is ended
        else:
            current_grade = self.current_grades.get_current_grade(course_id)
            return float(current_grade.percent) * 100

    def get_all_final_grades(self):
        """
        Returns a list of final grades for only the passed courses.

        Returns:
            dict: dictionary of course_ids: floats representing final grades for a course
        """
        final_grades = {
            course_id: self.get_final_grade(course_id)
            for course_id in self.course_ids
        }
        # filter out None grades
        return {
            course_id: final_grade
            for course_id, final_grade in final_grades.items()
            if final_grade is not None
        }

    def calculate_final_grade_average(self):
        """
        Calculates an average grade (integer) from the program final grades
        """
        final_grades = self.get_all_final_grades()
        if final_grades:
            return round(sum(Decimal(final_grade) for final_grade in final_grades.values()) / len(final_grades))

    def get_current_grade(self, course_id):
        """
        Returns the current grade number for the user in the course if enrolled.

        Args:
            course_id (str): an edX course run id

        Returns:
            float: the current grade of the user in the course
        """
        if not self.is_enrolled(course_id):
            return
        current_grade = self.current_grades.get_current_grade(course_id)
        if current_grade is None:
            return
        return float(current_grade.percent) * 100

    def count_courses_passed(self):
        """
        Calculates number of passed courses in program.

        Returns:
            int: A number of passed courses.
        """
        passed_courses = set(
            self.edx_key_course_map[course_id]
            for course_id in self.course_ids
            if self.has_passed_course(course_id)
        )
        return len(passed_courses)

    def get_pearson_exam_status(self):  # pylint: disable=too-many-return-statements
        """
        Get the pearson exam status for the user / program combo

        Returns:
            str: description of Pearson profile status
        """

        course_runs_for_program = CourseRun.objects.filter(
            course__program=self.program
        )

        if not any(course_has_exam(self, cr) for cr in course_runs_for_program):
            return ""

        user = self.user
        try:
            exam_profile = ExamProfile.objects.get(profile=user.profile)
        except ExamProfile.DoesNotExist:
            return ExamProfile.PROFILE_ABSENT

        if exam_profile.status in (ExamProfile.PROFILE_PENDING, ExamProfile.PROFILE_IN_PROGRESS):
            return ExamProfile.PROFILE_IN_PROGRESS

        elif exam_profile.status == ExamProfile.PROFILE_INVALID:
            return ExamProfile.PROFILE_INVALID

        elif exam_profile.status == ExamProfile.PROFILE_SUCCESS:
            now = datetime.now(utc)
            auths = ExamAuthorization.objects.filter(
                user=user,
                status=ExamAuthorization.STATUS_SUCCESS,
                date_first_eligible__lt=now,
                date_last_eligible__gt=now,
            )

            if auths.exists():
                return ExamProfile.PROFILE_SCHEDULABLE
            else:
                return ExamProfile.PROFILE_SUCCESS

        else:
            log.error(
                'Unexpected ExamProfile status for ExamProfile %s',
                exam_profile.id
            )
            return ExamProfile.PROFILE_INVALID


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
