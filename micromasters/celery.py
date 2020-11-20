"""
As described in
http://celery.readthedocs.org/en/latest/django/first-steps-with-django.html
"""

import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'micromasters.settings')

app = Celery('micromasters')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.task_default_queue = "default"
app.autodiscover_tasks()

app.conf.task_routes = {
	"dashboard.tasks.*": {"queue": "dashboard"}
}
