"""
Serializers for grades app
"""
from rest_framework.serializers import ModelSerializer

from grades.models import ProctoredExamGrade


class ProctoredExamGradeSerializer(ModelSerializer):
    """
    Serializer for ProctoredExamGrade.
    """

    class Meta:
        model = ProctoredExamGrade
        fields = (
            "exam_date",
            "passing_score",
            "score",
            "grade",
            "client_authorization_id",
            "passed",
            "percentage_grade",
        )
