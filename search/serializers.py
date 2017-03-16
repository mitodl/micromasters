"""
Serializers for search results
"""
import copy
import inspect

from rest_framework import serializers

from profiles.serializers import (
    ProfileLimitedSerializer,
    ProfileSerializer,
)


class DictSerializer(serializers.Serializer):
    def to_representation(self, obj):
        # print(obj)
        return obj


class ProfileLimitedSourceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    profile = ProfileLimitedSerializer()


class BaseSearchSerializer(serializers.Serializer):
    _shards = DictSerializer()
    took = serializers.IntegerField()
    timed_out = serializers.BooleanField()
    aggregations = DictSerializer()
    hits = None


class BaseHitSerializer(serializers.Serializer):
    _id = serializers.CharField()
    _index = serializers.CharField()
    _score = serializers.CharField()
    _source = None
    _type = serializers.CharField()
    sort = serializers.ListSerializer(child=serializers.CharField())


class LimitedHitSerializer(BaseHitSerializer):
    _source = ProfileLimitedSourceSerializer()


class HitSerializer(BaseHitSerializer):
    _source = DictSerializer()


class BaseHitsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    hits = None


class LimitedHitsSerializer(BaseHitsSerializer):
    hits = serializers.ListSerializer(child=LimitedHitSerializer())


class HitsSerializer(BaseHitsSerializer):
    hits = serializers.ListSerializer(child=HitSerializer())


class ProfileLimitedSearchSerializer(BaseSearchSerializer):
    hits = LimitedHitsSerializer()


class ProfileSearchSerializer(BaseSearchSerializer):
    hits = HitsSerializer()
