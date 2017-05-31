"""
Tests for the mail serializers
"""
from mail.factories import AutomaticEmailFactory
from mail.serializers import AutomaticEmailSerializer, PercolateQuerySerializer

from search.base import MockedESTestCase


class AutomaticEmailSerializerTests(MockedESTestCase):
    """
    AutomaticEmailSerializerTests
    """
    def test_serializer_includes_correct_data(self):
        """
        Just testing that the right fields come through
        """
        automatic = AutomaticEmailFactory.create()
        serialized = AutomaticEmailSerializer(automatic)
        assert serialized.data == {
            "enabled": automatic.enabled,
            "email_subject": automatic.email_subject,
            "email_body": automatic.email_body,
            "sender_name": automatic.sender_name,
            "id": automatic.id,
            "query": PercolateQuerySerializer(automatic.query).data
        }
