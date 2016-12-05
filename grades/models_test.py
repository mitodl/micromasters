"""
Tests for grades models
"""
from django.core.exceptions import ValidationError

from courses.factories import CourseRunFactory
from grades.models import FinalGrade
from micromasters.factories import UserFactory
from search.base import ESTestCase


class FinalGradeModelTests(ESTestCase):
    """
    Tests for final grade model
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.user1 = UserFactory.create()
        cls.user2 = UserFactory.create()
        cls.course_run = CourseRunFactory.create()

    def test_grade_validation_save(self):
        """
        Tests that the save method performs a full validation of the rade input
        """
        # basic final grade creation
        grade1 = FinalGrade.objects.create(
            user=self.user1,
            course_run=self.course_run,
            grade=0.65,
        )

        # it fails to modify it to a value >1 or <0
        for val in (-0.5, 1.3, ):
            with self.assertRaises(ValidationError):
                grade1.grade = val
                grade1.save()

        # it fails also to create the grades from scratch
        for val in (-0.5, 1.3, ):
            with self.assertRaises(ValidationError):
                FinalGrade.objects.create(
                    user=self.user2,
                    course_run=self.course_run,
                    grade=val,
                )
