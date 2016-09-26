from rest_framework import serializers
from wagtail.wagtailimages.models import Image
from cms.models import ProgramPage, ProgramFaculty


class ImageSerializer(serializers.ModelSerializer):
    "Serializer for Wagtail Image objects."
    class Meta:  # pylint: disable=missing-docstring
        model = Image
        fields = ("title", "file", "width", "height", "created_at", "file_size")


class ProgramSerializer(serializers.ModelSerializer):
    "Serializer for ProgramPage objects."
    class Meta:
        model = ProgramPage
        fields = ('description', 'faculty_description')


class FacultySerializer(serializers.ModelSerializer):
    "Serializer for ProgramFaculty objects."
    image = ImageSerializer(read_only=True)

    class Meta:  # pylint: disable=missing-docstring
        model = ProgramFaculty
        fields = ('name', 'title', 'short_bio', 'image')
