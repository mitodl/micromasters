"""
Serializers for Wagtail-related models
"""
from rest_framework import serializers
from wagtail.images.models import Image, Rendition
from django.utils.text import slugify

from cms.models import ProgramPage, ProgramFaculty
from courses.serializers import CourseSerializer, ElectivesSetSerializer


class RenditionSerializer(serializers.ModelSerializer):
    """Serializer for Wagtail Rendition objects."""
    class Meta:
        model = Rendition
        fields = ("file", "width", "height")


class FacultyImageSerializer(serializers.ModelSerializer):
    """Serializer for faculty images."""
    alt = serializers.CharField(source="default_alt_text")
    rendition = serializers.SerializerMethodField()

    def get_rendition(self, image):
        """Serialize a rendition for the faculty image"""
        rendition = image.get_rendition('fill-500x385')
        return RenditionSerializer(rendition).data

    class Meta:
        model = Image
        fields = ('alt', 'rendition',)


class FacultySerializer(serializers.ModelSerializer):
    """Serializer for ProgramFaculty objects."""
    image = FacultyImageSerializer(read_only=True)

    class Meta:
        model = ProgramFaculty
        fields = ('name', 'title', 'short_bio', 'image')


class ProgramPageSerializer(serializers.ModelSerializer):
    """
    Used to output info into the SETTINGS object on a program page.
    """
    id = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    faculty = FacultySerializer(source='faculty_members', many=True)
    courses = serializers.SerializerMethodField()  # Core courses
    electives_sets = ElectivesSetSerializer(source='program.electives_set', many=True)  # Contains elective courses

    def get_courses(self, programpage):
        """Get only core courses for a program."""
        elective_course_ids = programpage.program.electives_set.filter(electivecourse__isnull=False).values_list(
            'electivecourse__course__id')
        # Return only core courses in program serializer. All elective courses would be part of electives_sets
        # If there is no elective set associated with program, All the associated courses with program will be treated
        # as core courses
        return CourseSerializer(programpage.program.course_set.exclude(id__in=elective_course_ids), many=True).data

    def get_id(self, programpage):
        """Get the ID of the program"""
        if not programpage.program:
            return None
        return programpage.program.id

    def get_slug(self, programpage):
        """Slugify the program's title for Zendesk"""
        if not programpage.program:
            return None
        return slugify(programpage.program.title)

    class Meta:
        model = ProgramPage
        fields = ('id', 'title', 'slug', 'faculty', 'courses', 'electives_sets')
