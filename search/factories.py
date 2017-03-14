"""Factories for search models"""
from factory import DictFactory
from factory.django import DjangoModelFactory

from search.models import PercolateQuery


class PercolateQueryFactory(DjangoModelFactory):
    """Factory for PercolateQuery"""
    query = DictFactory()
    original_query = DictFactory()

    class Meta:
        model = PercolateQuery
