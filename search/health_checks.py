"""Custom django-health-check backend for OpenSearch."""

import dataclasses

from django.conf import settings
from health_check.base import HealthCheck
from health_check.exceptions import ServiceUnavailable
from opensearchpy import OpenSearch


@dataclasses.dataclass
class OpenSearchHealthCheck(HealthCheck):
    """Check OpenSearch cluster connectivity by pinging a dedicated client."""

    def run(self):  # pylint: disable=invalid-overridden-method
        use_ssl = bool(settings.OPENSEARCH_HTTP_AUTH)
        client = OpenSearch(
            hosts=[settings.OPENSEARCH_URL],
            http_auth=settings.OPENSEARCH_HTTP_AUTH,
            use_ssl=use_ssl,
            verify_certs=use_ssl,
        )
        if not client.ping():
            raise ServiceUnavailable("Unable to connect to OpenSearch")
