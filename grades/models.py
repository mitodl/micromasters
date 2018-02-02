"""
Models for the grades app
"""
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.utils import IntegrityError

from courses.models import (
    Course,
    CourseRun,
    Program,
)
from exams.models import ExamRun
from exams.pearson.constants import EXAM_GRADE_PASS, EXAM_GRADE_FAIL
from grades.constants import FinalGradeStatus
from micromasters.models import (
    AuditableModel,
    AuditModel,
    TimestampedModel,
)
from micromasters.utils import (
    now_in_utc,
    serialize_model_object,
    generate_md5,
)


class CourseRunGradingAlreadyCompleteError(Exception):
    """
    Custom Exception to raise in case a change of status for a course run is attempted
    """


class FinalGradeQuerySet(models.QuerySet):
    """
    QuerySet class defining common query parameters for FinalGrade
    """
    def passed(self):
        """
        Returns a queryset with a filter that will only fetch passed course runs
        """
        return self.filter(passed=True)

    def paid_on_edx(self):
        """
        Returns a queryset with a filter that will only fetch course runs that are paid on edX.
        Note that a course run can still be paid via an Order if this value is False for a given user.
        """
        return self.filter(course_run_paid_on_edx=True)

    def for_course_run_key(self, edx_course_key):
        """
        Returns a queryset with a filter that will only fetch course runs that match a course key
        """
        return self.filter(course_run__edx_course_key=edx_course_key)

    def for_course_run_keys(self, edx_course_keys):
        """
        Returns a queryset with a filter that will only fetch course runs that match one of many course keys
        """
        return self.filter(course_run__edx_course_key__in=edx_course_keys)


class FinalGrade(TimestampedModel, AuditableModel):
    """
    Model to store edx final grades
    """
    # Set a custom manager for this model. This lets us do a couple useful things:
    # (1) Apply commonly-needed filters by a short, easily-recognized name, and (2) compose a query piece-by-piece.
    # Docs: https://docs.djangoproject.com/en/1.10/topics/db/managers/#creating-a-manager-with-queryset-methods
    objects = FinalGradeQuerySet.as_manager()

    user = models.ForeignKey(User, null=False)
    course_run = models.ForeignKey(CourseRun, null=False)
    grade = models.FloatField(
        null=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    passed = models.BooleanField(default=False)
    status = models.CharField(
        null=False,
        choices=[(status, status) for status in FinalGradeStatus.ALL_STATUSES],
        default=FinalGradeStatus.PENDING,
        max_length=30,
    )
    course_run_paid_on_edx = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'course_run')

    @classmethod
    def get_audit_class(cls):
        return FinalGradeAudit

    def to_dict(self):
        return serialize_model_object(self)

    @property
    def grade_percent(self):
        """Returns the grade field value as a number out of 100 (or None if the value is None)"""
        return self.grade * 100 if self.grade is not None else None

    @property
    def has_certificate(self):
        """Returns true if there is a certificate for this grade"""
        try:
            self.certificate
        except self._meta.model.certificate.RelatedObjectDoesNotExist:
            return False
        return True

    @classmethod
    def get_frozen_users(cls, course_run):
        """
        Returns all the users with a final grade in a given course run
        """
        return list(
            cls.objects.filter(
                course_run=course_run, status=FinalGradeStatus.COMPLETE
            ).values_list('user', flat=True)
        )

    def __str__(self):
        return 'Grade in course "{course_id}", user "{user}", value {grade}'.format(
            user=self.user.username,
            grade=self.grade,
            course_id=self.course_run.edx_course_key
        )

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        """Overridden method to run validation"""
        self.full_clean()
        return super().save(*args, **kwargs)


class FinalGradeAudit(AuditModel):
    """
    Audit table for the Final Grade
    """
    final_grade = models.ForeignKey(FinalGrade, null=True, on_delete=models.SET_NULL)

    @classmethod
    def get_related_field_name(cls):
        return 'final_grade'

    def __str__(self):
        return 'Grade audit for user "{user}", course "{course_id}"'.format(
            user=self.final_grade.user,
            course_id=self.final_grade.course_run.edx_course_key
        )


class MicromastersCourseCertificate(TimestampedModel):
    """
    Model for storing MicroMasters course certificates
    """
    final_grade = models.OneToOneField(FinalGrade, null=False, related_name='certificate')
    hash = models.CharField(max_length=32, null=False, unique=True)

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        """Overridden save method"""
        if not self.hash:
            self.hash = generate_md5(
                '{}|{}'.format(self.final_grade.user_id, self.final_grade.course_run_id).encode('utf-8')
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return 'final_grade_id={final_grade_id}, hash="{hash}"'.format(
            final_grade_id=self.final_grade.id,
            hash=self.hash,
        )


class MicromastersProgramCertificate(TimestampedModel):
    """
    Model for storing MicroMasters program certificates
    """
    program = models.ForeignKey(Program, null=False)
    user = models.ForeignKey(User, null=False)
    hash = models.CharField(max_length=32, null=False, unique=True)

    class Meta:
        unique_together = ('user', 'program')

    def save(self, *args, **kwargs):  # pylint: disable=arguments-differ
        """Overridden save method"""
        if not self.hash:
            self.hash = generate_md5(
                '{}|{}'.format(self.user_id, self.program_id).encode('utf-8')
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return 'Program Certificate for user={user}, program={program}, hash="{hash}"'.format(
            user=self.user,
            program=self.program,
            hash=self.hash,
        )


class CourseRunGradingStatus(TimestampedModel):
    """
    Additional information for the course run related to the final grades
    """
    course_run = models.OneToOneField(CourseRun, null=False)
    status = models.CharField(
        null=False,
        choices=[(status, status) for status in FinalGradeStatus.ALL_STATUSES],
        default=FinalGradeStatus.PENDING,
        max_length=30,
    )

    def __str__(self):
        return 'Freezing status "{status}" for course "{course_id}"'.format(
            course_id=self.course_run.edx_course_key,
            status=self.status
        )

    @classmethod
    def is_complete(cls, course_run):
        """
        Returns True if there is an entry with status 'complete'
        """
        return cls.objects.filter(course_run=course_run, status=FinalGradeStatus.COMPLETE).exists()

    @classmethod
    def is_pending(cls, course_run):
        """
        Returns True if there is an entry with status 'pending'
        """
        return cls.objects.filter(course_run=course_run, status=FinalGradeStatus.PENDING).exists()

    @classmethod
    def set_to_complete(cls, course_run):
        """
        Sets the status for the course_run to complete
        """
        course_run_grade_status, _ = cls.objects.get_or_create(course_run=course_run)
        if course_run_grade_status.status != FinalGradeStatus.COMPLETE:
            course_run_grade_status.status = FinalGradeStatus.COMPLETE
            course_run_grade_status.save()
        return course_run

    @classmethod
    def create_pending(cls, course_run):
        """
        Creates an entry with status pending
        """
        try:
            course_fg_info, _ = cls.objects.get_or_create(course_run=course_run, status=FinalGradeStatus.PENDING)
        except IntegrityError:
            raise CourseRunGradingAlreadyCompleteError(
                'Course Run "{0}" has already been completed'.format(course_run.edx_course_key))
        return course_fg_info


class ProctoredExamGrade(TimestampedModel, AuditableModel):
    """
    Model to store proctored exam grades (like the pearson exams)
    """
    # relationship to other models
    user = models.ForeignKey(User, null=False)
    course = models.ForeignKey(Course, null=False)
    exam_run = models.ForeignKey(ExamRun, null=True)

    # fields from proctorate exam results
    exam_date = models.DateTimeField()
    passing_score = models.FloatField()
    score = models.FloatField()
    grade = models.TextField()
    client_authorization_id = models.TextField()

    # dump of all the remaining fields coming from the proctorate exam results
    row_data = JSONField(null=False)

    # custom fields based on proctorate exam results
    passed = models.BooleanField()
    percentage_grade = models.FloatField(null=False)

    @classmethod
    def get_audit_class(cls):
        return ProctoredExamGradeAudit

    @classmethod
    def for_user_course(cls, user, course):
        """
        Returns a queryset of the exam result for an user in a course of a program
        """
        now = now_in_utc()
        return cls.objects.filter(user=user, course=course, exam_run__date_grades_available__lte=now)

    def set_score(self, new_score):
        """
        Sets a value for the score field, then sets related fields based on that value

        Args:
            new_score (float): The new score value
        """
        self.score = new_score
        self.percentage_grade = self.score / 100.0
        self.passed = self.score >= self.passing_score
        self.grade = EXAM_GRADE_PASS if self.passed else EXAM_GRADE_FAIL

    def to_dict(self):
        return serialize_model_object(self)

    def __str__(self):
        return 'Proctored Exam Grade in course "{course_title}", user "{user}"'.format(
            user=self.user.username,
            course_title=self.course.title
        )


class ProctoredExamGradeAudit(AuditModel):
    """
    Audit table for the ProctoredExamGrade
    """
    proctored_exam_grade = models.ForeignKey(ProctoredExamGrade, null=True, on_delete=models.SET_NULL)

    @classmethod
    def get_related_field_name(cls):
        return 'proctored_exam_grade'

    def __str__(self):
        return 'Proctored Exam Grade audit for user "{user}", course "{course_title}"'.format(
            user=self.proctored_exam_grade.user,
            course_title=self.proctored_exam_grade.course.title
        )


class CombinedFinalGrade(TimestampedModel, AuditableModel):
    """
    Model to store a combined grade for course_run and an exam
    """
    user = models.ForeignKey(User, null=False)
    course = models.ForeignKey(Course, null=False)
    grade = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    class Meta:
        unique_together = ('user', 'course')

    @classmethod
    def get_audit_class(cls):
        return CombinedFinalGradeAudit

    def to_dict(self):
        return serialize_model_object(self)

    def __str__(self):
        return 'Combined Final Grade in course "{course_title}", user "{user}", value {grade}'.format(
            user=self.user.username,
            grade=self.grade,
            course_title=self.course.title
        )


class CombinedFinalGradeAudit(AuditModel):
    """
    Audit table for CombinedFinalGrade
    """
    combined_final_grade = models.ForeignKey(CombinedFinalGrade, null=True, on_delete=models.SET_NULL)

    @classmethod
    def get_related_field_name(cls):
        return 'combined_final_grade'

    def __str__(self):
        return 'Combined Final Grade audit for user "{user}", course "{course_title}"'.format(
            user=self.combined_final_grade.user,
            course_title=self.combined_final_grade.course.title
        )
