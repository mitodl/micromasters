"""
Factories for dashboard
"""
from datetime import timedelta
from random import randint

import faker
from factory import LazyAttribute, SubFactory, Trait
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyDateTime

from dashboard.models import (
    CachedCertificate,
    CachedCurrentGrade,
    CachedEnrollment,
    ProgramEnrollment,
    UserCacheRefreshTime,
)
from courses.factories import (
    CourseRunFactory,
    CourseFactory,
    ProgramFactory,
)
from micromasters.factories import UserFactory
from micromasters.utils import now_in_utc


FAKE = faker.Factory.create()


# pylint: disable=arguments-differ
class CachedCertificateFactory(DjangoModelFactory):
    """Factory for Certificate"""
    user = SubFactory(UserFactory)
    course_run = SubFactory(CourseRunFactory)
    data = LazyAttribute(lambda x: {
        "certificate_type": "verified",
        "grade": randint(60, 100)/100.0,
        "course_id": x.course_run.edx_course_key,
        "username": x.user.username,
        "status": "downloadable",
    })

    class Meta:
        model = CachedCertificate


class CachedCurrentGradeFactory(DjangoModelFactory):
    """Factory for CurrentGrade"""
    user = SubFactory(UserFactory)
    course_run = SubFactory(CourseRunFactory)
    data = LazyAttribute(lambda x: {
        "passed": FAKE.boolean(),
        "percent": randint(60, 100)/100.0,
        "course_id": x.course_run.edx_course_key,
        "username": x.user.username,
    })

    class Meta:
        model = CachedCurrentGrade


class CachedEnrollmentFactory(DjangoModelFactory):
    """Factory for Enrollment"""
    user = SubFactory(UserFactory)
    course_run = SubFactory(CourseRunFactory)
    data = LazyAttribute(lambda x: {
        "is_active": True,
        "mode": "verified",
        "user": x.user.username,
        "course_details": {
            "course_id": x.course_run.edx_course_key,
        }
    })

    class Meta:
        model = CachedEnrollment

    class Params:
        verified = False
        unverified = Trait(
            data=LazyAttribute(lambda x: {
                "is_active": True,
                "mode": "audit",
                "user": x.user.username,
                "course_details": {
                    "course_id": x.course_run.edx_course_key,
                }
            })
        )

    @classmethod
    def create(cls, **kwargs):
        """
        Overrides the default .create() method. Previously created Order/Line for FA courses
        with verified enrollments, but payments are now discontinued.
        """
        created_obj = super().create(**kwargs)
        return created_obj


class UserCacheRefreshTimeFactory(DjangoModelFactory):
    """Factory for UserCacheRefreshTime"""
    user = SubFactory(UserFactory)
    # enrollments expire after 5 minutes, this generates a last request between 10 minutes ago and now
    enrollment = FuzzyDateTime(now_in_utc() - timedelta(minutes=10))
    # certificates expire after 6 hours, this generates a last request between 6:15 hours ago and now
    certificate = FuzzyDateTime(now_in_utc() - timedelta(hours=6, minutes=15))
    # current grades expire after 1 hour, this generates a last request between 1:15 hours ago and now
    current_grade = FuzzyDateTime(now_in_utc() - timedelta(hours=1, minutes=15))
    current_grade_mitxonline = FuzzyDateTime(now_in_utc() - timedelta(hours=1, minutes=15))
    enrollment_mitxonline = FuzzyDateTime(now_in_utc() - timedelta(minutes=10))

    class Meta:
        model = UserCacheRefreshTime

    class Params:
        unexpired = Trait(
            enrollment=now_in_utc() + timedelta(days=1),
            certificate=now_in_utc() + timedelta(days=1),
            current_grade=now_in_utc() + timedelta(days=1),
            enrollment_mitxonline=now_in_utc() + timedelta(days=1),
            current_grade_mitxonline=now_in_utc() + timedelta(days=1),
        )
        expired = Trait(
            enrollment=now_in_utc() - timedelta(days=1),
            certificate=now_in_utc() - timedelta(days=1),
            current_grade=now_in_utc() - timedelta(days=1),
            enrollment_mitxonline=now_in_utc() - timedelta(days=1),
            current_grade_mitxonline=now_in_utc() + timedelta(days=1),
        )


class ProgramEnrollmentFactory(DjangoModelFactory):
    """Factory for ProgramEnrollment"""
    user = SubFactory(UserFactory)
    program = SubFactory(ProgramFactory)

    class Meta:
        model = ProgramEnrollment

    @classmethod
    def create(cls, **kwargs):
        """
        Overrides default ProgramEnrollment object creation for the factory.
        """
        user = kwargs.get('user', UserFactory.create())
        program = kwargs.get('program', ProgramFactory.create())
        course = CourseFactory.create(program=program)
        course_run = CourseRunFactory.create(course=course)
        CachedEnrollmentFactory.create(user=user, course_run=course_run)
        CachedCertificateFactory.create(user=user, course_run=course_run)
        CachedCurrentGradeFactory.create(user=user, course_run=course_run)
        program_enrollment = ProgramEnrollment.objects.create(user=user, program=program)
        return program_enrollment
