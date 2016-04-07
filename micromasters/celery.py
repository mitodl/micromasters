"""
As described in
http://celery.readthedocs.org/en/latest/django/first-steps-with-django.html
"""
# pylint: disable=invalid-name
from __future__ import absolute_import

import os
import logging

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'micromasters.settings')

from django.conf import settings

log = logging.getLogger(__name__)

async = Celery('micromasters')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
async.config_from_object('django.conf:settings')
async.autodiscover_tasks(lambda: settings.INSTALLED_APPS)  # pragma: no cover
