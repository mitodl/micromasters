"""Healthcheck urls"""

from django.conf import settings
from django.urls import include, path, re_path
from health_check.views import HealthCheckView
from redis.asyncio import Redis as RedisClient

BASE_CHECKS = [
    "health_check.Cache",
    "health_check.Database",
    (
        "health_check.contrib.redis.Redis",
        {"client_factory": lambda: RedisClient.from_url(settings.CELERY_BROKER_URL)},
    ),
    "search.health_checks.OpenSearchHealthCheck",
]


urlpatterns = [
    path(
        "health/",
        include(
            [
                re_path(
                    r"startup\/?",
                    HealthCheckView.as_view(
                        checks=[
                            *BASE_CHECKS,
                        ]
                    ),
                ),
                re_path(
                    r"liveness\/?",
                    HealthCheckView.as_view(
                        checks=[
                            "health_check.Database",
                        ]
                    ),
                ),
                re_path(
                    r"readiness\/?",
                    HealthCheckView.as_view(
                        checks=[
                            *BASE_CHECKS,
                        ]
                    ),
                ),
                re_path(
                    r"full\/?",
                    HealthCheckView.as_view(
                        checks=[
                            *BASE_CHECKS,
                            "health_check.contrib.celery.Ping",
                        ]
                    ),
                ),
            ]
        ),
    ),
]
