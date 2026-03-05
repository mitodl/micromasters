"""Factories for the grades app"""
import datetime
import uuid

from factory import Faker, LazyAttribute, SubFactory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyDateTime, FuzzyFloat, FuzzyText

from courses.factories import CourseFactory, CourseRunFactory, ProgramFactory
from exams.constants import EXAM_GRADE_FAIL, EXAM_GRADE_PASS
from exams.factories import ExamRunFactory
from grades.constants import FinalGradeStatus
from grades.models import (FinalGrade, MicromastersCourseCertificate,
                           MicromastersProgramCertificate,
                           MicromastersProgramCommendation, ProctoredExamGrade)
from micromasters.factories import UserFactory
from micromasters.utils import now_in_utc


class FinalGradeFactory(DjangoModelFactory):
    """Factory for FinalGrade"""
    user = SubFactory(UserFactory)
    course_run = SubFactory(CourseRunFactory)
    grade = FuzzyFloat(low=0, high=1)
    passed = Faker('boolean')
    status = FinalGradeStatus.COMPLETE
    course_run_paid_on_edx = Faker('boolean')

    class Meta:  # pylint: disable=missing-docstring,too-few-public-methods
        model = FinalGrade


class ProctoredExamGradeFactory(DjangoModelFactory):
    """Factory for ProctoredExamGrade"""
    user = SubFactory(UserFactory)
    course = SubFactory(CourseFactory)
    exam_run = SubFactory(ExamRunFactory)
    exam_date = FuzzyDateTime(now_in_utc() - datetime.timedelta(weeks=4))
    # this assumes that the max score is 100
    passing_score = 60.0
    score = LazyAttribute(lambda x: x.percentage_grade * 100)
    grade = LazyAttribute(lambda x: EXAM_GRADE_PASS if x.passed else EXAM_GRADE_FAIL)
    client_authorization_id = FuzzyText()
    row_data = {"From factory": True}
    passed = Faker('boolean')
    percentage_grade = FuzzyFloat(low=0, high=1)

    class Meta:  # pylint: disable=missing-docstring,too-few-public-methods
        model = ProctoredExamGrade


class MicromastersCourseCertificateFactory(DjangoModelFactory):
    """Factory for MicromastersCourseCertificate"""
    user = SubFactory(UserFactory)
    course = SubFactory(CourseFactory)
    hash = uuid.uuid4().hex

    class Meta:  # pylint: disable=missing-docstring,too-few-public-methods
        model = MicromastersCourseCertificate


class MicromastersProgramCertificateFactory(DjangoModelFactory):
    """Factory for MicromastersProgramCertificate"""

    user = SubFactory(UserFactory)
    program = SubFactory(ProgramFactory)
    hash = uuid.uuid4().hex

    class Meta:  # pylint: disable=missing-docstring,too-few-public-methods
        model = MicromastersProgramCertificate


class MicromastersProgramCommendationFactory(DjangoModelFactory):
    """Factory for MicromastersProgramCommendation"""

    user = SubFactory(UserFactory)
    program = SubFactory(ProgramFactory)

    class Meta:  # pylint: disable=missing-docstring,too-few-public-methods
        model = MicromastersProgramCommendation
