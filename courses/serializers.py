"""
Serializers for courses
"""
from rest_framework import serializers

from courses.models import Course, Program, CourseRun, ElectiveCourse
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
            return program.programpage.url
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
    elective_tag = serializers.SerializerMethodField()

    def get_description(self, course):
        """Choose the right description for course"""
        if hasattr(course, 'programcourse') and course.programcourse.description:
            return course.programcourse.description
        return course.description

    def get_elective_tag(self, course):
        """If the course is an elective"""
        if not course.program.electives_set.exists():
            return ""
        return 'Elective' if ElectiveCourse.objects.filter(course=course).exists() else 'Core'

    class Meta:
        model = Course
        fields = (
            'id',
            'title',
            'description',
            'url',
            'enrollment_text',
            'elective_tag',
        )


class CourseRunSerializer(serializers.ModelSerializer):
    """Serializer for Course Run Objects"""
    program_title = serializers.CharField(source='course.program.title')

    class Meta:
        model = CourseRun
        fields = ('edx_course_key', 'program_title')
