"""Factories for discussions models"""
from datetime import timedelta
from django.db.models.signals import post_save
from factory import (
    Faker,
    fuzzy,
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
from micromasters.utils import now_in_utc
from profiles.factories import UserFactory
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
    user = SubFactory(UserFactory)
    username = Faker('user_name')
    last_sync = fuzzy.FuzzyDateTime(now_in_utc() - timedelta(hours=12))

    @classmethod
    def create(cls, *args, **kwargs):
        """
        Overrides the default .create() method to turn off save signals
        """
        with mute_signals(post_save):
            return super().create(*args, **kwargs)

    class Meta:
        model = DiscussionUser
