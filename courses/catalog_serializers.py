"""
Serializers for courses
"""
from rest_framework import serializers

from cms.models import ProgramPage
from courses.models import Course, Program, CourseRun
from courses.serializers import TopicSerializer
from micromasters.utils import first_matching_item


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
    total_price = serializers.SerializerMethodField()
    start_date = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()
    enrollment_start = serializers.SerializerMethodField()

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

    def get_total_price(self, program):
        """Get the combined price of all courses"""
        return str(program.price * program.num_required_courses)

    def get_start_date(self, program):
        """Get the starting date of the first course in the program"""
        course = program.course_set.order_by("position_in_program").first()
        if not course:
            return None
        first_unexpired = first_matching_item(
            course.courserun_set.all().order_by("start_date"), lambda run: run.is_unexpired
        )
        return first_unexpired.start_date if first_unexpired else None

    def get_end_date(self, program):
        """Get the ending date of the last course of the program"""
        course = program.course_set.order_by("position_in_program").last()
        if not course:
            return None
        last_unexpired = first_matching_item(
            course.courserun_set.all().order_by("-start_date"), lambda run: run.is_unexpired
        )
        return last_unexpired.end_date if last_unexpired else None

    def get_enrollment_start(self, program):
        """Get the start date for enrollment of the first course in the program"""
        course = program.course_set.order_by("position_in_program").first()
        if not course:
            return None
        first_unexpired = first_matching_item(
            course.courserun_set.all().order_by("start_date"), lambda run: run.is_unexpired
        )
        return first_unexpired.enrollment_start if first_unexpired else None

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
            'total_price',
            'start_date',
            'end_date',
            'enrollment_start',
        )
