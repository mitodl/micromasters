"""Factories for search models"""
from factory import DictFactory
from factory.fuzzy import FuzzyChoice
from factory.django import DjangoModelFactory

from search.models import PercolateQuery


class PercolateQueryFactory(DjangoModelFactory):
    """Factory for PercolateQuery"""
    query = DictFactory()
    original_query = DictFactory()
    source_type = FuzzyChoice(choices=PercolateQuery.SOURCE_TYPES)

    class Meta:
        model = PercolateQuery
