"""
Serializers for Wagtail-related models
"""
from rest_framework import serializers
from wagtail.wagtailimages.models import Image, Rendition

from cms.models import ProgramFaculty


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
        return RenditionSerializer().to_representation(image.get_rendition('fill-500x385'))

    class Meta:  # pylint: disable=missing-docstring
        model = Image
        fields = ('alt', 'rendition',)


class FacultySerializer(serializers.ModelSerializer):
    """Serializer for ProgramFaculty objects."""
    image = FacultyImageSerializer(read_only=True)

    class Meta:  # pylint: disable=missing-docstring
        model = ProgramFaculty
        fields = ('name', 'title', 'short_bio', 'image')
