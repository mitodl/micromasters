"""
Serializers for courses
"""
from rest_framework import serializers

from cms.models import ProgramPage
from courses.models import Course, Program, CourseRun
from courses.serializers import TopicSerializer


class CatalogCourseRunSerializer(serializers.ModelSerializer):
    """Serializer for Course Run Objects"""

    class Meta:
        model = CourseRun
        fields = ('id', 'edx_course_key',)


class CatalogCourseSerializer(serializers.ModelSerializer):
    """Serializer for Course objects"""

    course_runs = CatalogCourseRunSerializer(source="courserun_set", many=True)

    class Meta:
        model = Course
        fields = (
            'id',
            'edx_key',
            "position_in_program",
            'course_runs',
        )


class CatalogProgramSerializer(serializers.ModelSerializer):
    """Serializer for Program objects"""
    programpage_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    instructors = serializers.SerializerMethodField()

    courses = CatalogCourseSerializer(source="course_set", many=True)
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

    def get_thumbnail_url(self, program):
        """
        Returns the program thumbnail URL or None if no program page exists

        Args:
            program (courses.models.Program):
                A program
        Returns:
            str: The programpage thumbnail URL or None
        """
        from cms.models import ProgramPage
        try:
            if getattr(program.programpage, "thumbnail_image", None) is not None:
                return program.programpage.thumbnail_image.get_rendition('fill-300x186').url
            else:
                return None
        except ProgramPage.DoesNotExist:
            return None

    def get_instructors(self, program):
        """Get the list of instructors from the program page"""
        try:
            page = program.programpage
        except ProgramPage.DoesNotExist:
            return []

        return list(page.faculty_members.values("name"))

    class Meta:
        model = Program
        fields = (
            'id',
            'title',
            'programpage_url',
            'thumbnail_url',
            'instructors',
            'courses',
            'topics',
        )
