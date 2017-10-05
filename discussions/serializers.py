"""
Serializers for discussions
"""
from open_discussions_api.channels.constants import VALID_CHANNEL_TYPES
from rest_framework import serializers

from discussions.api import add_channel
from search.api import create_search_obj


class ChannelSerializer(serializers.Serializer):
    """
    Serializer for a channel
    """
    title = serializers.CharField()
    name = serializers.CharField()
    public_description = serializers.CharField(required=False, allow_blank=True)
    channel_type = serializers.ChoiceField(choices=[
        (choice, choice) for choice in VALID_CHANNEL_TYPES
    ])
    query = serializers.JSONField()
    program_id = serializers.IntegerField()

    def create(self, validated_data):
        user = self.context['request'].user

        search_obj = create_search_obj(
            user,
            search_param_dict=validated_data['query']
        )
        title = validated_data['title']
        name = validated_data['name']
        public_description = validated_data['public_description']
        channel_type = validated_data['channel_type']
        program_id = validated_data['program_id']
        channel = add_channel(
            original_search=search_obj,
            title=title,
            name=name,
            public_description=public_description,
            channel_type=channel_type,
            program_id=program_id,
        )
        return {
            "title": title,
            "name": name,
            "query": channel.query.query,
            "public_description": public_description,
            "channel_type": channel_type,
            "program_id": program_id,
        }
