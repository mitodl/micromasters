"""
Serializers for mail
"""

from rest_framework import (
    fields,
    serializers
)


class FinancialAidMailSerializer(serializers.Serializer):
    """
    Serializer for financial aid email requests
    """
    email_subject = fields.CharField(label="Email Subject")
    email_body = fields.CharField(label="Email Body", style={"base_template": "textarea.html"})
