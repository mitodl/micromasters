"""
WSGI config for micromasters app.

Exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/stable/howto/deployment/wsgi/
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "micromasters.settings")

# In modern Django deployments we rely on the web server (nginx/uwsgi) for static files.
# Remove dj_static Cling wrapper, which is not needed and not compatible with newer versions.
application = get_wsgi_application()  # pylint: disable=invalid-name
