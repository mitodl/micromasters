"""
Serializers for courses
"""
from rest_framework import serializers

from courses.models import Course, Program


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
