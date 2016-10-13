"""
Serializers for courses
"""
from rest_framework import serializers

from courses.models import Course, CourseRun, Program


class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program objects"""
    class Meta:  # pylint: disable=missing-docstring
        model = Program
        fields = ('id', 'title',)


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course objects"""
    class Meta:  # pylint: disable=missing-docstring
        model = Course
        fields = ('id', 'title', 'description', 'url', 'enrollment_text')


class CourseRunSerializer(serializers.ModelSerializer):
    """Serializer for CourseRun objects"""
    program = serializers.SerializerMethodField()

    class Meta:  # pylint: disable=missing-docstring
        model = CourseRun
        exclude = ('edx_course_key',)

    def get_program(self, obj):  # pylint: disable=no-self-use
        """
        Get program id.
        """
        return obj.course.program.id
