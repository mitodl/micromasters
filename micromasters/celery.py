"""
As described in
http://celery.readthedocs.org/en/latest/django/first-steps-with-django.html
"""

import logging
import os

from celery import Celery
from raven import Client
from raven.contrib.celery import register_logger_signal, register_signal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'micromasters.settings')

from django.conf import settings  # noqa pylint: disable=wrong-import-position

log = logging.getLogger(__name__)


client = Client(**settings.RAVEN_CONFIG)

register_logger_signal(client, loglevel=logging.ERROR)

# The register_signal function can also take an optional argument
# `ignore_expected` which causes exception classes specified in Task.throws
# to be ignored
register_signal(client, ignore_expected=True)

app = Celery('micromasters')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)  # pragma: no cover
