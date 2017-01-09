"""
Utility functions and classes for the dashboard
"""
import logging
from decimal import Decimal
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Max, Min, Q

from courses.models import CourseRun
from ecommerce.models import Line
from financialaid.constants import FinancialAidStatus
from financialaid.models import FinancialAid, TierProgram


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
        This means the grade in the certificate for normal programs
        or the current_grade for ended courses.

        Args:
            course_id (str): an edX course run id

        Returns:
            float: the final grade of the user in the course
        """
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
        final_grades = {}
        for course_id in self.course_ids:
            final_grade = self.get_final_grade(course_id)
            if final_grade is not None:
                final_grades[course_id] = final_grade
        return final_grades

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
        passed_courses = set()
        for course_id in self.course_ids:
            if self.has_passed_course(course_id):
                passed_courses.add(self.edx_key_course_map[course_id])
        return len(passed_courses)
