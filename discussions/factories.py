"""Factories for discussions models"""
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from factory import (
    Faker,
    SubFactory,
)
from factory.django import (
    DjangoModelFactory,
    mute_signals,
)

from courses.factories import ProgramFactory
from discussions.models import (
    Channel,
    ChannelProgram,
    DiscussionUser,
)
from search.factories import PercolateQueryFactory
from search.models import PercolateQuery


class ChannelFactory(DjangoModelFactory):
    """Factory for Channel"""
    name = Faker('uuid4')
    query = SubFactory(PercolateQueryFactory, source_type=PercolateQuery.DISCUSSION_CHANNEL_TYPE)

    class Meta:
        model = Channel


class ChannelProgramFactory(DjangoModelFactory):
    """Factory for ChannelProgram"""
    channel = SubFactory(ChannelFactory)
    program = SubFactory(ProgramFactory)

    class Meta:
        model = ChannelProgram


class DiscussionUserFactory(DjangoModelFactory):
    """Factory for DiscussionUser"""
    user = SubFactory(User)
    username = Faker('user_name')
    last_sync = Faker('date_time_this_month')

    @classmethod
    def create(cls, *args, **kwargs):
        """
        Overrides the default .create() method to turn off save signals
        """
        with mute_signals(post_save):
            return super().create(*args, **kwargs)

    class Meta:
        model = DiscussionUser
