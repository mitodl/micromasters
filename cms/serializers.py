"""
Serializers for Wagtail-related models
"""
from rest_framework import serializers
from wagtail.wagtailimages.models import Image, Rendition
from django.utils.text import slugify

from cms.models import ProgramPage, ProgramFaculty
from courses.serializers import CourseSerializer


class RenditionSerializer(serializers.ModelSerializer):
    """Serializer for Wagtail Rendition objects."""
    class Meta:
        model = Rendition
        fields = ("file", "width", "height")


class FacultyImageSerializer(serializers.ModelSerializer):
    """Serializer for faculty images."""
    alt = serializers.CharField(source="default_alt_text")
    rendition = serializers.SerializerMethodField()

    def get_rendition(self, image):  # pylint: disable=no-self-use
        """Serialize a rendition for the faculty image"""
        rendition = image.get_rendition('fill-500x385')
        return RenditionSerializer(rendition).data

    class Meta:  # pylint: disable=missing-docstring
        model = Image
        fields = ('alt', 'rendition',)


class FacultySerializer(serializers.ModelSerializer):
    """Serializer for ProgramFaculty objects."""
    image = FacultyImageSerializer(read_only=True)

    class Meta:  # pylint: disable=missing-docstring
        model = ProgramFaculty
        fields = ('name', 'title', 'short_bio', 'image')


class ProgramPageSerializer(serializers.ModelSerializer):
    """
    Used to output info into the SETTINGS object on a program page.
    """
    id = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    faculty = FacultySerializer(source='faculty_members', many=True)
    courses = CourseSerializer(source='program.course_set', many=True)

    def get_id(self, programpage):  # pylint: disable=no-self-use
        """Get the ID of the program"""
        if not programpage.program:
            return None
        return programpage.program.id

    def get_slug(self, programpage):  # pylint: disable=no-self-use
        """Slugify the program's title for Zendesk"""
        if not programpage.program:
            return None
        return slugify(programpage.program.title)

    class Meta:  # pylint: disable=missing-docstring
        model = ProgramPage
        fields = ('id', 'title', 'slug', 'faculty', 'courses')
