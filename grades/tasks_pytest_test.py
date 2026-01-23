"""
Tests for grades tasks
"""
import pytest

pytestmark = [
    pytest.mark.usefixtures('mocked_opensearch'),
    pytest.mark.django_db,
]
