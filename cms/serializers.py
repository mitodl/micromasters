"""
Serializers for Wagtail-related models
"""
from rest_framework import serializers
from wagtail.wagtailimages.models import Image, Rendition
from cms.models import ProgramPage, ProgramFaculty


class RenditionSerializer(serializers.ModelSerializer):
    """Serializer for Wagtail Rendition objects."""
    class Meta:
        model = Rendition
        fields = ("file", "width", "height")


class ImageRenditionsField(serializers.RelatedField):
    """
    Field to output serialized versions of three sizes of an image:
    small (100px), medium (500px), and large (1000px).
    """
    def to_representation(self, image):
        serializer = RenditionSerializer()
        small = image.get_rendition('fill-100x100')
        medium = image.get_rendition('fill-500x500')
        large = image.get_rendition('fill-1000x1000')
        return {
            "small": serializer.to_representation(small),
            "medium": serializer.to_representation(medium),
            "large": serializer.to_representation(large),
        }


class ImageSerializer(serializers.ModelSerializer):
    """Serializer for Wagtail Image objects."""
    alt = serializers.CharField(source="default_alt_text")
    sizes = ImageRenditionsField(source='*', read_only=True)

    class Meta:  # pylint: disable=missing-docstring
        model = Image
        fields = ("title", "alt", "file", "width", "height",
                  "created_at", "file_size", "sizes")


class ProgramSerializer(serializers.ModelSerializer):
    """Serializer for ProgramPage objects."""
    class Meta:
        model = ProgramPage
        fields = ('description', 'faculty_description')


class FacultySerializer(serializers.ModelSerializer):
    """Serializer for ProgramFaculty objects."""
    image = ImageSerializer(read_only=True)

    class Meta:  # pylint: disable=missing-docstring
        model = ProgramFaculty
        fields = ('name', 'title', 'short_bio', 'image')
