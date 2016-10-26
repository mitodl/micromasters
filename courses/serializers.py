"""
Serializers for courses
"""
from rest_framework import serializers

from courses.models import Course, Program


# pylint: disable=no-self-use
class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program objects"""
    programpage_url = serializers.SerializerMethodField()

    def get_programpage_url(self, program):
        """
        Returns the program page URL or None if no program page exists

        Args:
            program (courses.models.Program):
                A program
        Returns:
            str: The programpage URL or None
        """
        from cms.models import ProgramPage
        try:
            return program.programpage.url
        except ProgramPage.DoesNotExist:
            return

    class Meta:  # pylint: disable=missing-docstring
        model = Program
        fields = (
            'id',
            'title',
            'programpage_url',
        )


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course objects"""
    class Meta:  # pylint: disable=missing-docstring
        model = Course
        fields = (
            'id',
            'title',
            'description',
            'url',
            'enrollment_text',
        )
