"""Factories for search models"""
import factory
from factory.fuzzy import FuzzyChoice
from factory.django import DjangoModelFactory

from micromasters.factories import UserFactory
from search.models import PercolateQuery, PercolateQueryMembership


class PercolateQueryFactory(DjangoModelFactory):
    """Factory for PercolateQuery"""
    query = factory.DictFactory()
    original_query = factory.DictFactory()
    source_type = FuzzyChoice(choices=PercolateQuery.SOURCE_TYPES)

    class Meta:
        model = PercolateQuery


class PercolateQueryMembershipFactory(DjangoModelFactory):
    """Factory for PercolateQueryMembership"""
    query = factory.SubFactory(PercolateQueryFactory)
    user = factory.SubFactory(UserFactory)

    is_member = factory.Faker('boolean')
    needs_update = factory.Faker('boolean')

    class Meta:
        model = PercolateQueryMembership

    class Params:
        pending_add = factory.Trait(
            is_member=True,
            needs_update=True,
        )
        pending_remove = factory.Trait(
            is_member=False,
            needs_update=True,
        )
