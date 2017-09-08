"""Factories for discussions models"""
from factory import (
    Faker,
    SubFactory,
)
from factory.django import DjangoModelFactory

from discussions.models import Channel
from search.factories import PercolateQueryFactory
from search.models import PercolateQuery


class ChannelFactory(DjangoModelFactory):
    """Factory for Channel"""
    name = Faker('numerify', text='channel_#')
    query = SubFactory(PercolateQueryFactory, source_type=PercolateQuery.DISCUSSION_CHANNEL_TYPE)

    class Meta:
        model = Channel
