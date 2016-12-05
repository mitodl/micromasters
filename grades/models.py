"""
Models for the grades app
"""
from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from courses.models import CourseRun
from micromasters.models import (
    AuditableModel,
    AuditModel,
    TimestampedModel,
)
from micromasters.utils import serialize_model_object


class FinalGradeStatus:
    """
    Possible statuses for the Final Grades
    """
    PENDING = 'pending'
    COMPLETE = 'complete'
    ALL_STATUSES = [PENDING, COMPLETE]


class FinalGrade(TimestampedModel, AuditableModel):
    """
    Model to store final grades
    """
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

    class Meta:
        unique_together = ('user', 'course_run')

    @classmethod
    def get_audit_class(cls):
        return FinalGradeAudit

    def to_dict(self):
        return serialize_model_object(self)

    def __str__(self):
        return 'Grade in course "{course_id}", user "{user}", value {grade}'.format(
            user=self.user.username,
            grade=self.grade,
            course_id=self.course_run.edx_course_key
        )

    def save(self, *args, **kwargs):
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
