"""
Serializers for courses
"""
from rest_framework import serializers

from courses.models import Course, Program, CourseRun, ElectiveCourse, Topic, ElectivesSet
from dashboard.models import ProgramEnrollment


class TopicSerializer(serializers.ModelSerializer):
    """ Serializer for Topic objects"""

    class Meta:
        model = Topic
        fields = ("name",)


class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program objects"""
    programpage_url = serializers.SerializerMethodField()
    enrolled = serializers.SerializerMethodField()
    total_courses = serializers.SerializerMethodField()
    topics = TopicSerializer(many=True)

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
            return program.programpage.get_full_url()
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
            'topics',
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


class ElectivesSetSerializer(serializers.ModelSerializer):
    """Serializer for Elective Sets """
    courses = serializers.SerializerMethodField()

    def get_courses(self, elective_set):
        """Get all the elective courses associated with an ElectivesSet through ElectiveCourse"""
        elective_courses = Course.objects.filter(
            id__in=ElectiveCourse.objects.filter(electives_set=elective_set).values('course'))
        return CourseSerializer(elective_courses, many=True).data

    class Meta:
        model = ElectivesSet
        fields = (
            'required_number',
            'title',
            'courses',
        )


class CourseRunSerializer(serializers.ModelSerializer):
    """Serializer for Course Run Objects"""
    program_title = serializers.CharField(source='course.program.title')

    class Meta:
        model = CourseRun
        fields = ('edx_course_key', 'program_title')
