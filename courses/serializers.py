"""
Serializers for courses
"""
from rest_framework import serializers

from courses.models import Course, Program
from dashboard.models import ProgramEnrollment


class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program objects"""
    programpage_url = serializers.SerializerMethodField()
    enrolled = serializers.SerializerMethodField()
    total_courses = serializers.SerializerMethodField()

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
            page = program.programpage
            if page.external_program_page_url:
                return page.external_program_page_url
            return page.url
        except ProgramPage.DoesNotExist:
            return None

    def get_enrolled(self, program):
        """
        Returns true if the user is enrolled in the program
        """
        user = self.context['request'].user
        return ProgramEnrollment.objects.filter(user=user, program=program).exists()

    def get_total_courses(self, program):
        """
        Returns the number of courses in the program
        """
        return program.course_set.count()

    class Meta:
        model = Program
        fields = (
            'id',
            'title',
            'programpage_url',
            'enrolled',
            'total_courses',
        )


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course objects"""
    description = serializers.SerializerMethodField()

    def get_description(self, course):
        """Choose the right description for course"""
        if hasattr(course, 'programcourse') and course.programcourse.description:
            return course.programcourse.description
        return course.description

    class Meta:
        model = Course
        fields = (
            'id',
            'title',
            'description',
            'url',
            'enrollment_text',
        )
