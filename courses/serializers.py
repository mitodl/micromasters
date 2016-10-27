"""
Serializers for courses
"""
from rest_framework import serializers

from courses.models import Course, Program
from dashboard.models import ProgramEnrollment


# pylint: disable=no-self-use
class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program objects"""
    programpage_url = serializers.SerializerMethodField()
    enrolled = serializers.SerializerMethodField()

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

    def get_enrolled(self, program):
        """
        Returns true if the user
        """
        if 'request' in self.context:
            user = self.context['request'].user
            return ProgramEnrollment.objects.filter(user=user, program=program).exists()
        else:
            return False

    class Meta:  # pylint: disable=missing-docstring
        model = Program
        fields = (
            'id',
            'title',
            'programpage_url',
            'enrolled',
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
