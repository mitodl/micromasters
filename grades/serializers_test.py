"""
Tests for serializers module
"""
from grades.factories import ProctoredExamGradeFactory
from grades.serializers import ProctoredExamGradeSerializer
from search.base import MockedESTestCase


class ProctExamSerializerTest(MockedESTestCase):
    """
    Tests for ProctoredExamGradeSerializer
    """

    @classmethod
    def setUpTestData(cls):
        cls.proct_grade = ProctoredExamGradeFactory()
        cls.proct_grade_2 = ProctoredExamGradeFactory(
            user=cls.proct_grade.user,
            course=cls.proct_grade.course
        )

        cls.expected_fields = sorted([
            'exam_date',
            'passing_score',
            'score',
            'grade',
            'client_authorization_id',
            'passed',
            'percentage_grade',
        ])

    def test_single(self):
        """
        Tests happy path for single object
        """
        serialized_data = ProctoredExamGradeSerializer(self.proct_grade).data

        assert sorted(serialized_data.keys()) == self.expected_fields

    def test_multiple(self):
        """
        Tests happy path for multiple objects
        """
        serialized_data = ProctoredExamGradeSerializer(
            [self.proct_grade, self.proct_grade_2],
            many=True
        ).data

        for serialized_elem in serialized_data:
            assert sorted(serialized_elem.keys()) == self.expected_fields
